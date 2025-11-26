import sql from './db.js';

export default async (req, context) => {
    try {
        // Check if the database connection is properly configured
        if (!process.env.DATABASE_URL) {
            throw new Error('DATABASE_URL environment variable is missing. Please add it in Netlify Site Settings.');
        }

        console.log('Attempting to connect to database...');
        
        // Test connection with a simple query
        const result = await sql`SELECT 1+1 as result`;
        console.log('Connection successful:', result);

        // Create users table
        await sql`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                email_verified BOOLEAN DEFAULT FALSE,
                two_factor_enabled BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `;

        // Add new columns if they don't exist
        await sql`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='email_verified') THEN
                    ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='two_factor_enabled') THEN
                    ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT FALSE;
                END IF;
            END $$;
        `;

        // Create sessions table
        await sql`
            CREATE TABLE IF NOT EXISTS sessions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                token VARCHAR(255) UNIQUE NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `;

        // Create verification codes table
        await sql`
            CREATE TABLE IF NOT EXISTS verification_codes (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) NOT NULL,
                code VARCHAR(6) NOT NULL,
                type VARCHAR(50) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                used BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `;

        // Create login attempts table for rate limiting
        await sql`
            CREATE TABLE IF NOT EXISTS login_attempts (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) NOT NULL,
                ip_address VARCHAR(45),
                attempt_count INTEGER DEFAULT 1,
                last_attempt_at TIMESTAMP DEFAULT NOW()
            )
        `;

        // Create indexes
        await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON verification_codes(email)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email)`;

        return new Response(JSON.stringify({
            success: true,
            message: 'Database connected and tables created successfully!'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Database error:', error);
        
        // Return the specific error message to the browser
        return new Response(JSON.stringify({
            success: false,
            error: 'Database Initialization Failed',
            details: error.message,
            hint: error.message.includes('ENOTFOUND') ? 'Check your Hostname/URL' : 
                  error.message.includes('password') ? 'Check your Password' : 
                  'Check your Database connection string'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};