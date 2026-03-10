import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';
import fs from 'fs';

const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST;

const dataDir = process.platform === 'win32'
    ? path.join(process.env.APPDATA, 'TaskPro')
    : path.join(os.homedir(), '.taskpro');

if (!fs.existsSync(dataDir)) {
    try { fs.mkdirSync(dataDir, { recursive: true }); } catch (e) { }
}

const dbPath = path.join(dataDir, 'taskpro.db');
export const db = isTest ? new Database(':memory:') : new Database(dbPath);

if (!isTest) {
    db.pragma('journal_mode = WAL');
}
db.pragma('foreign_keys = ON');
 
