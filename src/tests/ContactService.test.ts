import { expect } from 'chai';
import { db } from '../db/index.ts';
import { ContactService } from '../services/ContactService.ts';
import { ValidationError, NotFoundError } from '../utils/errors.ts';
import { UserService } from '../services/UserService.ts';

describe('ContactService', () => {
    let mockUser: any;
    before(() => {
        db.exec('DELETE FROM users');
        mockUser = UserService.create({ email: 'contact_test@taskpro.local', password: 'password', firstName: 'Admin', lastName: 'User', role: 'admin' });
        db.exec('DELETE FROM contacts');
        db.exec('DELETE FROM job_contacts');
    });

    afterEach(() => {
        db.exec('DELETE FROM contacts');
        db.exec('DELETE FROM job_contacts');
    });

    describe('create()', () => {
        it('should create a contact successfully', () => {
            const contact = ContactService.create(mockUser, {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                phone: '555-0100'
            });

            expect(contact).to.exist;
            expect(contact.id).to.be.greaterThan(0);
            expect(contact.firstName).to.equal('John');
            expect(contact.lastName).to.equal('Doe');
        });

        it('should throw ValidationError if both first and last name are missing', () => {
            expect(() => {
                ContactService.create(mockUser, { email: 'test@example.com' });
            }).to.throw(ValidationError);
        });

        it('should allow creation with only firstName', () => {
            const contact = ContactService.create(mockUser, { firstName: 'Jane' });
            expect(contact.firstName).to.equal('Jane');
            expect(contact.lastName).to.equal('');
        });
    });

    describe('update()', () => {
        it('should update an existing contact', () => {
            const contact = ContactService.create(mockUser, { firstName: 'Original' });
            const updated = ContactService.update(mockUser, contact.id, { firstName: 'Updated', email: 'up@example.com' });
            expect(updated.firstName).to.equal('Updated');
            expect(updated.email).to.equal('up@example.com');
        });
    });

    describe('delete()', () => {
        it('should delete an existing contact', () => {
            const contact = ContactService.create(mockUser, { firstName: 'Delete Me' });
            const success = ContactService.delete(contact.id);
            expect(success).to.be.true;

            expect(() => ContactService.getById(contact.id)).to.throw(NotFoundError);
        });
    });
});
 
 
