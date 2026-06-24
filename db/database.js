const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'trackers.db');

let db;

function getDb() {
    if (!db) {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        db = new DatabaseSync(DB_PATH);
        db.exec('PRAGMA foreign_keys = ON');
        db.exec('PRAGMA busy_timeout = 5000');
        try {
            db.exec('PRAGMA journal_mode = WAL');
        } catch {
            // WAL optional — avoid startup failure if DB has a stale lock
        }
        runMigrations(db);
    }
    return db;
}

function runMigrations(database) {
    database.exec(`
        CREATE TABLE IF NOT EXISTS approved_groups (
            tracker_id TEXT PRIMARY KEY,
            approved_at TEXT NOT NULL DEFAULT (datetime('now')),
            sharing_active INTEGER NOT NULL DEFAULT 0,
            started_at TEXT,
            stopped_at TEXT,
            title TEXT,
            host_nickname TEXT,
            default_can_create INTEGER NOT NULL DEFAULT 0,
            default_can_update INTEGER NOT NULL DEFAULT 0,
            default_can_delete INTEGER NOT NULL DEFAULT 0,
            notes TEXT
        );

        CREATE TABLE IF NOT EXISTS timers (
            id TEXT PRIMARY KEY,
            tracker_id TEXT NOT NULL,
            name TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT 'NONE',
            end_time INTEGER NOT NULL,
            total_duration INTEGER NOT NULL,
            added_by TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (tracker_id) REFERENCES approved_groups(tracker_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS member_permissions (
            tracker_id TEXT NOT NULL,
            nickname TEXT NOT NULL,
            can_create INTEGER NOT NULL,
            can_update INTEGER NOT NULL,
            can_delete INTEGER NOT NULL,
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            PRIMARY KEY (tracker_id, nickname),
            FOREIGN KEY (tracker_id) REFERENCES approved_groups(tracker_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS members (
            tracker_id TEXT NOT NULL,
            nickname TEXT NOT NULL,
            socket_id TEXT,
            is_host INTEGER NOT NULL DEFAULT 0,
            joined_at TEXT NOT NULL DEFAULT (datetime('now')),
            PRIMARY KEY (tracker_id, nickname),
            FOREIGN KEY (tracker_id) REFERENCES approved_groups(tracker_id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_timers_tracker_id ON timers(tracker_id);
    `);
}

function withTransaction(fn) {
    const database = getDb();
    database.exec('BEGIN IMMEDIATE');
    try {
        const result = fn(database);
        database.exec('COMMIT');
        return result;
    } catch (err) {
        try { database.exec('ROLLBACK'); } catch { /* ignore */ }
        throw err;
    }
}

module.exports = { getDb, DB_PATH, withTransaction };
