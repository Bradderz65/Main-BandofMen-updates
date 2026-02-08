import sql from './db.js';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';

export default async (req, context) => {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const { email, password, name, verificationCode } = await req.json();

        // Validate input
        if (!email || !password || !name) {
            return new Response(JSON.stringify({ error: 'Email, password, and name are required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return new Response(JSON.stringify({ error: 'Invalid email format' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Validate password strength
        if (password.length < 8) {
            return new Response(JSON.stringify({ error: 'Password must be at least 8 characters' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }


        // Check if user already exists
        const existingUser = await sql`SELECT id, email_verified FROM users WHERE email = ${email.toLowerCase()}`;
        if (existingUser.length > 0) {
            // If user exists but not verified, allow re-registration
            if (!existingUser[0].email_verified) {
                // Delete unverified user to allow fresh signup
                await sql`DELETE FROM users WHERE id = ${existingUser[0].id}`;
            } else {
                return new Response(JSON.stringify({ error: 'An account with this email already exists' }), {
                    status: 409,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }

        // If no verification code provided, this is step 1 - just validate and return
        if (!verificationCode) {
            return new Response(JSON.stringify({
                success: true,
                requiresVerification: true,
                message: 'Please verify your email'
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Verify the code
        const [verification] = await sql`
            SELECT id, expires_at 
            FROM verification_codes 
            WHERE email = ${email.toLowerCase()} 
              AND code = ${verificationCode} 
              AND type = 'signup'
              AND used = FALSE
            ORDER BY created_at DESC
            LIMIT 1
        `;

        if (!verification) {
            return new Response(JSON.stringify({ error: 'Invalid verification code' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (new Date(verification.expires_at) < new Date()) {
            return new Response(JSON.stringify({ error: 'Verification code has expired' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Mark code as used
        await sql`UPDATE verification_codes SET used = TRUE WHERE id = ${verification.id}`;

        // Hash password
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Create user with email verified
        const [newUser] = await sql`
            INSERT INTO users (email, password_hash, name, email_verified, created_at)
            VALUES (${email.toLowerCase()}, ${passwordHash}, ${name}, TRUE, NOW())
            RETURNING id, email, name, created_at
        `;

        // Generate session token
        const sessionToken = randomUUID();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        await sql`
            INSERT INTO sessions (user_id, token, expires_at)
            VALUES (${newUser.id}, ${sessionToken}, ${expiresAt})
        `;

        return new Response(JSON.stringify({
            success: true,
            user: {
                id: newUser.id,
                email: newUser.email,
                name: newUser.name
            },
            token: sessionToken
        }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Signup error:', error);
        const msg = String(error?.message || '');

        // Return safe, actionable configuration/setup errors instead of a generic message.
        // This avoids the UI reporting "An error occurred during signup" for common misconfig.
        let safeError = 'An error occurred during signup';
        if ((msg.includes('DATABASE_URL') || msg.includes('NETLIFY_DATABASE_URL')) && msg.includes('missing')) {
            safeError = 'Server is not configured: missing database URL env var (DATABASE_URL or NETLIFY_DATABASE_URL).';
        } else if (msg.toLowerCase().includes('relation') && msg.toLowerCase().includes('does not exist')) {
            safeError = "Database tables are missing. Run the init function '/.netlify/functions/init-db' once.";
        }

        return new Response(JSON.stringify({ error: safeError }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
