// Simple atomic token storage using sqlite3
// Used by OsmClient.js for token storage


const DB_FILE = path.join(process.cwd(), 'cache', 'token.db');

async function getDb() {
    return open({ filename: DB_FILE, driver: sqlite3.Database });
}

// Module-level promise to ensure DB is initialized only once
let _initPromise = (async () => {
    const db = await getDb();
    try {
        await db.run(`CREATE TABLE IF NOT EXISTS token (
            id INTEGER PRIMARY KEY CHECK (id = 0),
            token TEXT NOT NULL
        )`);
    } finally {
        await db.close();
    }
})();

export async function initTokenDb() {
    return _initPromise;
}

export async function saveToken(token) {
    await _initPromise;
    const db = await getDb();
    try {
        await db.run('INSERT OR REPLACE INTO token (id, token) VALUES (0, ?)', token);
    } finally {
        await db.close();
    }
}

export async function getToken() {
    await _initPromise;
    const db = await getDb();
    try {
        const row = await db.get('SELECT token FROM token WHERE id = 0');
        return row ? { token: row.token } : null;
    } finally {
        await db.close();
    }
}

export async function clearToken() {
    await _initPromise;
    const db = await getDb();
    try {
        await db.run('DELETE FROM token WHERE id = 0');
    } finally {
        await db.close();
    }
}
