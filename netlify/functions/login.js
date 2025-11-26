import sql from './db.js';
import bcrypt from 'bcryptjs';

export default async (req, context) => {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const { email, password, twoFactorCode } = await req.json();
        
        // Get IP address (Netlify specific header, fallback to connection)
        const ipAddress = req.headers.get('x-nf-client-connection-ip') || req.headers.get('client-ip') || 'unknown';

        // Validate input
        if (!email || !password) {
            return new Response(JSON.stringify({ error: 'Email and password are required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        const normalizedEmail = email.toLowerCase();

        // RATE LIMIT CHECK
        // Clean up old attempts first (older than 15 minutes)
        await sql`DELETE FROM login_attempts WHERE last_attempt_at < NOW() - INTERVAL '15 minutes'`;

        // Check attempts for this email
        const [attempt] = await sql`
            SELECT attempt_count, last_attempt_at 
            FROM login_attempts 
            WHERE email = ${normalizedEmail}
        `;

        if (attempt && attempt.attempt_count >= 5) {
            // Calculate minutes remaining
            const timeSinceLast = new Date() - new Date(attempt.last_attempt_at);
            const minutesLeft = Math.ceil((15 * 60 * 1000 - timeSinceLast) / 60000);
            
            return new Response(JSON.stringify({ 
                error: `Too many login attempts. Please try again in ${minutesLeft} minutes.` 
            }), {
                status: 429,
                headers: { 'Content-Type': 'application/json' }
            });
        }


        // Find user by email
        const [user] = await sql`
            SELECT id, email, password_hash, name, email_verified, two_factor_enabled 
            FROM users 
            WHERE email = ${normalizedEmail}
        `;

        const recordFailedAttempt = async () => {
            if (attempt) {
                await sql`
                    UPDATE login_attempts 
                    SET attempt_count = attempt_count + 1, last_attempt_at = NOW() 
                    WHERE email = ${normalizedEmail}
                `;
            } else {
                await sql`
                    INSERT INTO login_attempts (email, ip_address, attempt_count, last_attempt_at)
                    VALUES (${normalizedEmail}, ${ipAddress}, 1, NOW())
                `;
            }
        };

        if (!user) {
            await recordFailedAttempt();
            return new Response(JSON.stringify({ error: 'Invalid email or password' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Check if email is verified (allow legacy accounts that existed before verification was added)
        // If email_verified is null/undefined, treat as verified (legacy account)
        if (user.email_verified === false) {
            return new Response(JSON.stringify({ error: 'Please verify your email before logging in' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Verify password
        const passwordValid = await bcrypt.compare(password, user.password_hash);
        if (!passwordValid) {
            await recordFailedAttempt();
            return new Response(JSON.stringify({ error: 'Invalid email or password' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Success! Clear failed attempts
        await sql`DELETE FROM login_attempts WHERE email = ${normalizedEmail}`;

        // Check if 2FA is enabled
        if (user.two_factor_enabled) {
            // If no 2FA code provided, indicate that 2FA is required
            if (!twoFactorCode) {
                return new Response(JSON.stringify({
                    success: true,
                    requires2FA: true,
                    message: 'Two-factor authentication required'
                }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // Verify 2FA code
            const [verification] = await sql`
                SELECT id, expires_at 
                FROM verification_codes 
                WHERE email = ${normalizedEmail} 
                  AND code = ${twoFactorCode} 
                  AND type = 'login_2fa'
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
        }

        // Generate session token
        const sessionToken = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        // Delete any existing sessions for this user (optional: single session)
        await sql`DELETE FROM sessions WHERE user_id = ${user.id}`;

        // Create new session
        await sql`
            INSERT INTO sessions (user_id, token, expires_at)
            VALUES (${user.id}, ${sessionToken}, ${expiresAt})
        `;

        return new Response(JSON.stringify({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                two_factor_enabled: user.two_factor_enabled
            },
            token: sessionToken
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Login error:', error);
        return new Response(JSON.stringify({ error: 'An error occurred during login' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};