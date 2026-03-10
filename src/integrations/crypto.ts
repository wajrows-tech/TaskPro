import crypto from 'crypto';
import os from 'os';

// ── AES-256-GCM Encryption for Integration Credentials ──────────────────────

// derive a repeatable but machine-specific key
// In production, this should ideally be loaded from a secure environment variable (e.g., INTEGRATION_ENCRYPTION_KEY).
// For this architecture, we will use a fallback machine-derived key if env var is missing.
const getEncryptionKey = (): Buffer => {
    let baseSecret = process.env.INTEGRATION_ENCRYPTION_KEY;
    if (!baseSecret) {
        // Fallback for local dev
        baseSecret = `${os.hostname()}-taskpro-integrations-secret`;
    }
    // Hash it to exactly 32 bytes (256 bits) for AES-256
    return crypto.createHash('sha256').update(baseSecret).digest();
};

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SYMMETRIC_KEY = getEncryptionKey();

export function encryptCredentials(credentials: Record<string, any>): string {
    if (!credentials || Object.keys(credentials).length === 0) {
        return '{}';
    }

    const text = JSON.stringify(credentials);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, SYMMETRIC_KEY, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encryptedText
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decryptCredentials(encryptedText: string): Record<string, any> {
    if (!encryptedText || encryptedText === '{}') {
        return {};
    }

    try {
        const parts = encryptedText.split(':');
        if (parts.length !== 3) {
            throw new Error('Invalid encrypted format');
        }

        const [ivHex, authTagHex, encryptedHex] = parts;
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');

        const decipher = crypto.createDecipheriv(ALGORITHM, SYMMETRIC_KEY, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return JSON.parse(decrypted);
    } catch (err: any) {
        console.error('[Crypto] Decryption failed:', err.message);
        return {};
    }
}
 
 
