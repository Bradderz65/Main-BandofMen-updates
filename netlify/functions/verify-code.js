import sql from './db.js';

export default async (req, context) => {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const { email, code, type } = await req.json();

        if (!email || !code || !type) {
            return new Response(JSON.stringify({ error: 'Email, code, and type are required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }


        // Find valid code
        const [verification] = await sql`
            SELECT id, expires_at 
            FROM verification_codes 
            WHERE email = ${email.toLowerCase()} 
              AND code = ${code} 
              AND type = ${type}
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

        // Check if expired
        if (new Date(verification.expires_at) < new Date()) {
            return new Response(JSON.stringify({ error: 'Verification code has expired' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Mark code as used
        await sql`
            UPDATE verification_codes 
            SET used = TRUE 
            WHERE id = ${verification.id}
        `;

        // If this is a signup verification, mark email as verified
        if (type === 'signup') {
            await sql`
                UPDATE users 
                SET email_verified = TRUE, updated_at = NOW()
                WHERE email = ${email.toLowerCase()}
            `;
        }

        return new Response(JSON.stringify({
            success: true,
            message: 'Code verified successfully'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Verify code error:', error);
        return new Response(JSON.stringify({ error: 'Failed to verify code' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
