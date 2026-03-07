import { initializeSchema } from './schema.ts';
import { runMigrations } from './migrations.ts';

export function bootstrapDatabase() {
    initializeSchema();
    runMigrations();
}

export * from './connection.ts';
export * from './queries.ts';
export { generateJobNumber } from './migrations.ts';
