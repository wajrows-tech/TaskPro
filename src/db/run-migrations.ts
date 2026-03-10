import { runMigrations } from './migrations.ts';

console.log('[CLI] Starting database migrations...');

try {
    runMigrations();
    console.log('[CLI] Migrations completed successfully.');
    process.exit(0);
} catch (error) {
    console.error('[CLI] Migration failed:', error);
    process.exit(1);
}
 
