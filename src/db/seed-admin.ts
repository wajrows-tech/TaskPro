import { db } from './connection.ts';
import { UserService } from '../services/UserService.ts';
import { logger } from '../services/LoggerService.ts';

function seedAdminAndBackfill() {
    console.log('[Seed] Starting admin creation and data backfill...');

    // 1. Check if admin exists
    let admin = UserService.getByEmail('admin@taskpro.local');

    if (!admin) {
        console.log('[Seed] Admin user not found, creating default admin...');
        admin = UserService.create({
            email: 'admin@taskpro.local',
            password: 'password123', // Default known password for local
            firstName: 'System',
            lastName: 'Admin',
            role: 'admin',
            jobTitle: 'Super Administrator'
        }) as any; // Cast because create returns User without hash
        console.log(`[Seed] Created default Admin user with ID: ${admin.id}`);
    } else {
        console.log(`[Seed] Admin user already exists with ID: ${admin.id}`);
    }

    // 2. Backfill ownership fields for core entities
    console.log('[Seed] Backfilling ownership data...');
    const tables = ['jobs', 'tasks', 'contacts', 'estimates'];

    db.transaction(() => {
        for (const table of tables) {
            const result = db.prepare(`UPDATE ${table} SET ownerId = ?, createdById = ?, updatedById = ? WHERE ownerId IS NULL`).run(admin.id, admin.id, admin.id);
            console.log(`[Seed] Backfilled ${result.changes} records in ${table}`);
        }
    })();

    console.log('[Seed] ✅ Seeding and backfill complete!');
}

try {
    seedAdminAndBackfill();
    process.exit(0);
} catch (error) {
    console.error('[Seed] ❌ Failed to seed and backfill:', error);
    process.exit(1);
}
