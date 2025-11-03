// Simple atomic token and API state storage using sqlite3
// Used by OsmClient.js for token and API state storage

import path from 'path';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

const DB_FILE = path.join(process.cwd(), 'cache', 'token.db');

async function getDb() {
    return open({ filename: DB_FILE, driver: sqlite3.Database });
}

// Module-level promise to ensure DB is initialized only once
let _initPromise = (async () => {
    const db = await getDb();
    try {
        // Enable WAL mode for better concurrent access
        await db.run('PRAGMA journal_mode = WAL');
        await db.run('PRAGMA busy_timeout = 5000'); // Wait up to 5 seconds for locks
        
        await db.run(`CREATE TABLE IF NOT EXISTS token (
            id INTEGER PRIMARY KEY CHECK (id = 0),
            token TEXT NOT NULL
        )`);
        
        await db.run(`CREATE TABLE IF NOT EXISTS api_state (
            id INTEGER PRIMARY KEY CHECK (id = 0),
            LastCallTime TEXT NOT NULL,
            TooManyRequests INTEGER NOT NULL,
            RetryAfterSeconds INTEGER NOT NULL,
            RetryAfterTime TEXT NOT NULL,
            RateLimitLimit INTEGER,
            RateLimitRemaining INTEGER,
            RateLimitReset INTEGER,
            Blocked INTEGER NOT NULL,
            LastResponseBody TEXT
        )`);
        
        // Migration: Add LastResponseBody column if it doesn't exist
        try {
            await db.run(`ALTER TABLE api_state ADD COLUMN LastResponseBody TEXT`);
            console.log('Migration: Added LastResponseBody column to api_state table');
        } catch (e) {
            // Column already exists, ignore error
            if (!e.message.includes('duplicate column name')) {
                console.error('Migration error:', e.message);
            }
        }
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

export async function saveApiState(apiState) {
    await _initPromise;
    const db = await getDb();
    try {
        await db.run(
            `INSERT OR REPLACE INTO api_state 
            (id, LastCallTime, TooManyRequests, RetryAfterSeconds, RetryAfterTime, 
             RateLimitLimit, RateLimitRemaining, RateLimitReset, Blocked, LastResponseBody) 
            VALUES (0, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            apiState.LastCallTime.toISOString(),
            apiState.TooManyRequests ? 1 : 0,
            apiState.RetryAfterSeconds,
            apiState.RetryAfterTime.toISOString(),
            apiState.RateLimitLimit,
            apiState.RateLimitRemaining,
            apiState.RateLimitReset,
            apiState.Blocked ? 1 : 0,
            apiState.LastResponseBody
        );
    } finally {
        await db.close();
    }
}

export async function getApiState() {
    await _initPromise;
    const db = await getDb();
    try {
        const row = await db.get('SELECT * FROM api_state WHERE id = 0');
        if (!row) {
            return null;
        }
        return {
            LastCallTime: new Date(row.LastCallTime),
            TooManyRequests: row.TooManyRequests === 1,
            RetryAfterSeconds: row.RetryAfterSeconds,
            RetryAfterTime: new Date(row.RetryAfterTime),
            RateLimitLimit: row.RateLimitLimit,
            RateLimitRemaining: row.RateLimitRemaining,
            RateLimitReset: row.RateLimitReset,
            Blocked: row.Blocked === 1,
            LastResponseBody: row.LastResponseBody
        };
    } finally {
        await db.close();
    }
}

export async function clearApiState() {
    await _initPromise;
    const db = await getDb();
    try {
        await db.run('DELETE FROM api_state WHERE id = 0');
    } finally {
        await db.close();
    }
}

export async function clearAllState() {
    await _initPromise;
    const db = await getDb();
    try {
        await db.run('DELETE FROM token WHERE id = 0');
        await db.run('DELETE FROM api_state WHERE id = 0');
    } finally {
        await db.close();
    }
}
