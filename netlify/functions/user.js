import sql from './db.js';

export default async (req, context) => {
    // Allow GET (get user) and DELETE (logout)
    if (req.method !== 'GET' && req.method !== 'DELETE') {
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

        // Find session and user
        const [session] = await sql`
            SELECT s.user_id, s.expires_at, u.id, u.email, u.name, u.created_at, u.two_factor_enabled
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

        // Handle logout (DELETE request)
        if (req.method === 'DELETE') {
            await sql`DELETE FROM sessions WHERE token = ${token}`;
            return new Response(JSON.stringify({ success: true, message: 'Logged out successfully' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Return user data (GET request)
        return new Response(JSON.stringify({
            success: true,
            user: {
                id: session.id,
                email: session.email,
                name: session.name,
                created_at: session.created_at,
                two_factor_enabled: session.two_factor_enabled
            }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('User endpoint error:', error);
        return new Response(JSON.stringify({ error: 'An error occurred' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
