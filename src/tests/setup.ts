import { db } from '../db/connection.ts';
import { initializeSchema } from '../db/schema.ts';
import { runMigrations } from '../db/migrations.ts';

// Execute immediately when the file is loaded by Mocha
initializeSchema();
runMigrations();

console.log('✅ In-Memory Test Database Bootstrapped');
 
 
