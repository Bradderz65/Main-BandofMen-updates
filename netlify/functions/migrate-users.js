import sql from './db.js';

// One-time migration to mark existing users as email verified
// Call via: https://your-site/.netlify/functions/migrate-users
export default async (req, context) => {
    try {

        // Update all existing users to have email_verified = true
        const result = await sql`
            UPDATE users 
            SET email_verified = TRUE 
            WHERE email_verified IS NULL OR email_verified = FALSE
        `;

        // Also set two_factor_enabled to false for any null values
        await sql`
            UPDATE users 
            SET two_factor_enabled = FALSE 
            WHERE two_factor_enabled IS NULL
        `;

        return new Response(JSON.stringify({
            success: true,
            message: 'Existing users migrated successfully'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Migration error:', error);
        return new Response(JSON.stringify({
            error: 'Migration failed',
            details: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
