import { db } from '../src/db/connection.js';

console.log("--- JOBS SCHEMA ---");
const jobsRows = db.prepare("PRAGMA table_info(jobs)").all();
console.table(jobsRows);

console.log("\n--- CONTACTS SCHEMA ---");
const contactsRows = db.prepare("PRAGMA table_info(contacts)").all();
console.table(contactsRows);
