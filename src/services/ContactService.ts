import { db, queries } from '../db/index.ts';
import { validate, buildUpdate, VALID_CONTACT_ROLES } from '../api/utils.ts';
import { NotFoundError, ValidationError } from '../utils/errors.ts';
import type { JobContact, ContactRole } from '../types.ts';
import type { User } from './UserService.ts';

export class ContactService {

    static getAll() {
        return queries.allContacts.all();
    }

    static getById(id: number) {
        const contact = queries.contactById.get(id);
        if (!contact) throw new NotFoundError(`Contact with ID ${id} not found`);
        const jobs = queries.contactJobs.all(id);
        return { ...(contact as any), jobs };
    }

    static create(user: User, data: any) {
        if (!data.firstName && !data.lastName) {
            throw new ValidationError('Contact must have at least a first or last name');
        }

        const role = validate(data.role, VALID_CONTACT_ROLES, 'role', 'homeowner') as ContactRole;
        const result = db.prepare(`
            INSERT INTO contacts (firstName, lastName, role, company, email, phone, address, notes, ownerId, createdById)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            data.firstName || '',
            data.lastName || '',
            role,
            data.company || '',
            data.email || '',
            data.phone || '',
            data.address || '',
            data.notes || '',
            user.id,
            user.id
        );
        return queries.contactById.get(result.lastInsertRowid);
    }

    static update(user: User, id: number, data: any) {
        const contact = queries.contactById.get(id);
        if (!contact) throw new NotFoundError(`Contact with ID ${id} not found`);

        if (data.role) data.role = validate(data.role, VALID_CONTACT_ROLES, 'role') as ContactRole;

        const updateData: any = { ...data, updatedById: user.id };
        buildUpdate('contacts', id, updateData, ['firstName', 'lastName', 'role', 'company', 'email', 'phone', 'address', 'notes', 'ownerId', 'updatedById']);
        return queries.contactById.get(id);
    }

    static delete(id: number) {
        const result = db.prepare('DELETE FROM contacts WHERE id = ?').run(id);
        if (result.changes === 0) {
            throw new NotFoundError(`Contact with ID ${id} not found`);
        }
        return true;
    }

    // ── Job Linking ──
    static linkToJob(jobId: number, contactId: number, role?: string) {
        db.prepare('INSERT OR IGNORE INTO job_contacts (jobId, contactId, role) VALUES (?, ?, ?)').run(jobId, contactId, role || '');
        return true;
    }

    static unlinkFromJob(jobId: number, contactId: number) {
        db.prepare('DELETE FROM job_contacts WHERE jobId = ? AND contactId = ?').run(jobId, contactId);
        return true;
    }
}
 
