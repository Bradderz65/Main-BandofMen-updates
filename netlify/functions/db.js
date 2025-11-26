import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;

// Debug logging (will show up in Netlify Function logs)
console.log("Initializing Database Connection...");
if (!connectionString) {
    console.error("CRITICAL ERROR: DATABASE_URL environment variable is MISSING or UNDEFINED.");
} else {
    console.log(`DATABASE_URL found. Length: ${connectionString.length} characters.`);
    // Log the first few chars to verify protocol (should be 'postgres...')
    console.log(`Protocol start: ${connectionString.substring(0, 10)}...`);
}

let sql;

try {
    if (!connectionString) {
        // Create a dummy function that throws meaningful errors when called
        // This prevents the app from crashing at startup (import time)
        sql = async () => { throw new Error("Database connection failed: DATABASE_URL is missing."); };
        sql.unsafe = sql; // mock unsafe method
    } else {
        // ---------------------------------------------------------
        // CORE CONNECTION LOGIC
        // ---------------------------------------------------------
        sql = postgres(connectionString, {
            ssl: 'require',
            connect_timeout: 10, // seconds
        });
    }
} catch (err) {
    console.error("CRITICAL ERROR: Failed to initialize postgres client:", err);
    // Fallback to avoid crash
    sql = async () => { throw new Error(`Database initialization failed: ${err.message}`); };
}

export default sql;