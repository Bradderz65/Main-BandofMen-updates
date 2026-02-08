import postgres from 'postgres';

function normalizeEnvValue(v) {
    if (!v) return null;
    const s = String(v).trim();
    if (!s) return null;
    // netlify env:get prints these placeholder strings when the var isn't set
    if (s.startsWith('No value set in the ')) return null;
    return s;
}

function isValidPostgresUrl(v) {
    try {
        const u = new URL(v);
        return u.protocol === 'postgres:' || u.protocol === 'postgresql:';
    } catch {
        return false;
    }
}

function pickConnectionString() {
    // Prefer a user-defined DATABASE_URL, but support Netlify DB (Neon) integration vars too.
    // Netlify DB provides NETLIFY_DATABASE_URL (pooled) and NETLIFY_DATABASE_URL_UNPOOLED.
    const candidates = [
        ['DATABASE_URL', normalizeEnvValue(process.env.DATABASE_URL)],
        ['NETLIFY_DATABASE_URL', normalizeEnvValue(process.env.NETLIFY_DATABASE_URL)],
        ['NETLIFY_DATABASE_URL_UNPOOLED', normalizeEnvValue(process.env.NETLIFY_DATABASE_URL_UNPOOLED)],
    ];

    for (const [name, value] of candidates) {
        if (value && isValidPostgresUrl(value)) return { name, value };
    }

    // If values exist but are malformed, log which vars were present (no secrets).
    const present = candidates.filter(([, v]) => v).map(([n]) => n);
    if (present.length) {
        console.error(
            `CRITICAL ERROR: Database URL env var(s) present but invalid: ${present.join(', ')}. ` +
            'Expected a postgres:// URL.'
        );
    }

    return { name: null, value: null };
}

const { name: connectionSource, value: connectionString } = pickConnectionString();

// Debug logging (will show up in Netlify Function logs)
console.log("Initializing Database Connection...");
if (!connectionString) {
    console.error(
        "CRITICAL ERROR: No database URL found. Set DATABASE_URL or use Netlify DB (NETLIFY_DATABASE_URL/NETLIFY_DATABASE_URL_UNPOOLED)."
    );
} else {
    console.log(`${connectionSource} found. Length: ${connectionString.length} characters.`);
    // Log the first few chars to verify protocol (should be 'postgres...')
    console.log(`Protocol start: ${connectionString.substring(0, 10)}...`);
}

let sql;

try {
    if (!connectionString) {
        // Create a dummy function that throws meaningful errors when called
        // This prevents the app from crashing at startup (import time)
        sql = async () => {
            throw new Error(
                "Database connection failed: missing DATABASE_URL (or NETLIFY_DATABASE_URL/NETLIFY_DATABASE_URL_UNPOOLED)."
            );
        };
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
