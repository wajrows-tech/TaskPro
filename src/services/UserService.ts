import { db } from '../db/connection.ts';
import crypto from 'crypto';
import { AppError } from '../utils/errors.ts';
import { logger } from './LoggerService.ts';

export interface User {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    jobTitle: string;
    role: string;
    isActive: boolean;
    lastLoginAt?: string;
    createdAt: string;
    updatedAt: string;
}

export class UserService {
    private static hashPassword(password: string): string {
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto.scryptSync(password, salt, 64).toString('hex');
        return `${salt}:${hash}`;
    }

    public static verifyPassword(password: string, storedHash: string): boolean {
        const [salt, key] = storedHash.split(':');
        const hashBuffer = crypto.scryptSync(password, salt, 64);
        const keyBuffer = Buffer.from(key, 'hex');
        const match = crypto.timingSafeEqual(hashBuffer, keyBuffer);
        return match;
    }

    static create(data: { email: string; password?: string; firstName: string; lastName: string; role?: string; jobTitle?: string }): User {
        try {
            // Default password logic for development/seeding bypass
            const pwdToHash = data.password || crypto.randomBytes(16).toString('hex');
            const hashed = this.hashPassword(pwdToHash);

            const result = db.prepare(`
                INSERT INTO users (email, passwordHash, firstName, lastName, role, jobTitle)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(
                data.email.toLowerCase(),
                hashed,
                data.firstName,
                data.lastName,
                data.role || 'user',
                data.jobTitle || ''
            );

            logger.info(`[UserService] Created user ${data.email} with role ${data.role || 'user'}`);
            return this.getById(result.lastInsertRowid as number);
        } catch (err: any) {
            if (err.message.includes('UNIQUE constraint failed: users.email')) {
                throw new AppError('User with this email already exists', 409);
            }
            throw err;
        }
    }

    static getById(id: number): User {
        const user = db.prepare('SELECT id, email, firstName, lastName, jobTitle, role, isActive, lastLoginAt, createdAt, updatedAt FROM users WHERE id = ?').get(id) as User | undefined;
        if (!user) throw new AppError('User not found', 404);

        // SQLite returns integers for booleans
        user.isActive = Boolean(user.isActive);
        return user;
    }

    static getByEmail(email: string): (User & { passwordHash: string }) | undefined {
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase()) as any;
        if (user) {
            user.isActive = Boolean(user.isActive);
        }
        return user;
    }

    static list(): User[] {
        const users = db.prepare('SELECT id, email, firstName, lastName, jobTitle, role, isActive, lastLoginAt, createdAt, updatedAt FROM users').all() as User[];
        return users.map(u => ({ ...u, isActive: Boolean(u.isActive) }));
    }

    static updateLoginTimestamp(id: number) {
        db.prepare('UPDATE users SET lastLoginAt = CURRENT_TIMESTAMP WHERE id = ?').run(id);
    }
}
 
 
