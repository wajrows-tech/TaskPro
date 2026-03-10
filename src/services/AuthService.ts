import { db } from '../db/connection.ts';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../utils/errors.ts';
import { UserService, User } from './UserService.ts';
import { logger } from './LoggerService.ts';

export interface Session {
    id: string;
    userId: number;
    expiresAt: string;
    createdAt: string;
}

export class AuthService {
    /**
     * Authenticates a user and creates a secure session token.
     */
    static login(email: string, passwordString: string): { user: User; token: string } {
        const user = UserService.getByEmail(email);

        if (!user || !user.isActive) {
            logger.warn(`[AuthService] Failed login attempt for ${email} (User not found or inactive)`);
            throw new AppError('Invalid credentials', 401);
        }

        const isValid = UserService.verifyPassword(passwordString, user.passwordHash);

        if (!isValid) {
            logger.warn(`[AuthService] Failed login attempt for ${email} (Invalid password)`);
            throw new AppError('Invalid credentials', 401);
        }

        // Generate a cryptographically strong session token (UUID v4 is sufficient for basic bearer auth)
        const token = uuidv4();

        // Expiration: 7 days from now
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        db.prepare('INSERT INTO sessions (id, userId, expiresAt) VALUES (?, ?, ?)').run(
            token,
            user.id,
            expiresAt.toISOString()
        );

        UserService.updateLoginTimestamp(user.id);

        logger.info(`[AuthService] User ${user.email} logged in successfully`);

        const { passwordHash, ...safeUser } = user;
        return { user: safeUser as User, token };
    }

    /**
     * Validates a session token and returns the corresponding User if valid.
     */
    static validateSession(token: string): User | null {
        const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(token) as Session | undefined;

        if (!session) return null;

        // Check expiry
        if (new Date() > new Date(session.expiresAt)) {
            logger.info(`[AuthService] Session ${token} expired`);
            this.logout(token);
            return null;
        }

        try {
            return UserService.getById(session.userId);
        } catch (e) {
            return null;
        }
    }

    /**
     * Terminates a session.
     */
    static logout(token: string) {
        db.prepare('DELETE FROM sessions WHERE id = ?').run(token);
        logger.info(`[AuthService] Session ${token} revoked`);
    }

    /**
     * Purges all expired sessions from the database
     */
    static purgeExpiredSessions() {
        const result = db.prepare('DELETE FROM sessions WHERE expiresAt < CURRENT_TIMESTAMP').run();
        if (result.changes > 0) {
            logger.info(`[AuthService] Purged ${result.changes} expired sessions`);
        }
    }
}
 
 
