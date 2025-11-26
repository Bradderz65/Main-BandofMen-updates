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
        // Get token from Authorization header
        const authHeader = req.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return new Response(JSON.stringify({ error: 'No token provided' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const token = authHeader.substring(7);
        const { currentPassword, newPassword } = await req.json();

        // Validate input
        if (!currentPassword || !newPassword) {
            return new Response(JSON.stringify({ error: 'Current and new password are required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Validate new password strength
        if (newPassword.length < 8) {
            return new Response(JSON.stringify({ error: 'New password must be at least 8 characters' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }


        // Find session and user
        const [session] = await sql`
            SELECT s.user_id, s.expires_at, u.id, u.email, u.password_hash
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

        // Check if session has expired
        if (new Date(session.expires_at) < new Date()) {
            await sql`DELETE FROM sessions WHERE token = ${token}`;
            return new Response(JSON.stringify({ error: 'Session expired' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Verify current password
        const passwordValid = await bcrypt.compare(currentPassword, session.password_hash);
        if (!passwordValid) {
            return new Response(JSON.stringify({ error: 'Current password is incorrect' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Hash new password
        const saltRounds = 12;
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

        // Update password
        await sql`
            UPDATE users 
            SET password_hash = ${newPasswordHash}, updated_at = NOW()
            WHERE id = ${session.user_id}
        `;

        // Optionally: Invalidate all other sessions for security
        // await sql`DELETE FROM sessions WHERE user_id = ${session.user_id} AND token != ${token}`;

        return new Response(JSON.stringify({
            success: true,
            message: 'Password updated successfully'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Change password error:', error);
        return new Response(JSON.stringify({ error: 'An error occurred while changing password' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
