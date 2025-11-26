import sql from './db.js';

export default async (req, context) => {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        // Get token from Authorization header
        const authHeader = req.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return new Response(JSON.stringify({ error: 'No token provided' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const token = authHeader.substring(7);
        const { enable, verificationCode } = await req.json();

        if (typeof enable !== 'boolean') {
            return new Response(JSON.stringify({ error: 'Enable parameter is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }


        // Find session and user
        const [session] = await sql`
            SELECT s.user_id, s.expires_at, u.id, u.email, u.two_factor_enabled
            FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.token = ${token}
        `;

        if (!session) {
            return new Response(JSON.stringify({ error: 'Invalid or expired session' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (new Date(session.expires_at) < new Date()) {
            await sql`DELETE FROM sessions WHERE token = ${token}`;
            return new Response(JSON.stringify({ error: 'Session expired' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // If no verification code, request one
        if (!verificationCode) {
            return new Response(JSON.stringify({
                success: true,
                requiresVerification: true,
                message: 'Please verify with email code'
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Verify the code
        const codeType = enable ? 'enable_2fa' : 'disable_2fa';
        const [verification] = await sql`
            SELECT id, expires_at 
            FROM verification_codes 
            WHERE email = ${session.email} 
              AND code = ${verificationCode} 
              AND type = ${codeType}
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

        // Update 2FA setting
        await sql`
            UPDATE users 
            SET two_factor_enabled = ${enable}, updated_at = NOW()
            WHERE id = ${session.user_id}
        `;

        return new Response(JSON.stringify({
            success: true,
            two_factor_enabled: enable,
            message: enable ? 'Two-factor authentication enabled' : 'Two-factor authentication disabled'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Toggle 2FA error:', error);
        return new Response(JSON.stringify({ error: 'Failed to update 2FA setting' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
