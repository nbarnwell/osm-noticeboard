// Simple atomic token and API state storage using sqlite3
// Used by OsmClient.js for token and API state storage

import path from 'path';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import fs from 'fs';

const DB_FILE = path.join(process.cwd(), 'cache', 'token.db');

// Ensure parent directory exists to avoid SQLITE_CANTOPEN
try {
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
} catch (e) {
    console.error('Failed to create cache directory for DB file:', e);
    throw e;
}

let db;
let dbInitPromise;

export function getDb() {
    if (db) return Promise.resolve(db);

    if (!dbInitPromise) {
        dbInitPromise = open({
            filename: DB_FILE,
            driver: sqlite3.Database
        }).then(async instance => {
            db = instance;
            await db.run('PRAGMA journal_mode = WAL');
            await db.run('PRAGMA busy_timeout = 5000');

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

            try {
                await db.run(`ALTER TABLE api_state ADD COLUMN LastResponseBody TEXT`);
                console.log('Migration: Added LastResponseBody column to api_state table');
            } catch (e) {
                if (!e.message.includes('duplicate column name')) {
                    console.error('Migration error:', e.message);
                }
            }

            return db;
        });
    }

    return dbInitPromise;
}

export async function initTokenDb() {
    return getDb();
}

export async function saveToken(token) {
    const db = await getDb();
    await db.run('INSERT OR REPLACE INTO token (id, token) VALUES (0, ?)', token);
}

export async function getToken() {
    const db = await getDb();
    const row = await db.get('SELECT token FROM token WHERE id = 0');
    return row ? { token: row.token } : null;
}

export async function clearToken() {
    const db = await getDb();
    await db.run('DELETE FROM token WHERE id = 0');
}

export async function saveApiState(apiState) {
    const db = await getDb();
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
}

export async function getApiState() {
    const db = await getDb();
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
}

export async function clearApiState() {
    const db = await getDb();
    await db.run('DELETE FROM api_state WHERE id = 0');
}

export async function clearAllState() {
    const db = await getDb();
    await db.run('DELETE FROM token WHERE id = 0');
    await db.run('DELETE FROM api_state WHERE id = 0');
}
