import { expect } from 'chai';
import { db } from '../db/index.ts';
import { JobService } from '../services/JobService.ts';
import { ValidationError, NotFoundError } from '../utils/errors.ts';
import { UserService } from '../services/UserService.ts';

describe('JobService', () => {
    let mockUser: any;
    before(() => {
        db.exec('DELETE FROM users');
        mockUser = UserService.create({ email: 'job_test@taskpro.local', password: 'password', firstName: 'Admin', lastName: 'User', role: 'admin' });
        // Clear out tables before tests
        db.exec('DELETE FROM jobs');
        db.exec('DELETE FROM job_contacts');
        db.exec('DELETE FROM tasks');
        db.exec('DELETE FROM documents');
        db.exec('DELETE FROM communications');
    });

    afterEach(() => {
        // Clean up after each test
        db.exec('DELETE FROM jobs');
    });

    describe('create()', () => {
        it('should create a job with valid data', () => {
            const result = JobService.create(mockUser, { name: 'Test Roof Replacement', type: 'residential' });

            expect(result).to.exist;
            expect(result.id).to.be.greaterThan(0);
            expect(result.name).to.equal('Test Roof Replacement');
            expect(result.stage).to.equal('lead'); // Default stage
            expect(result.type).to.equal('residential');
        });

        it('should throw ValidationError if name is missing', () => {
            expect(() => {
                JobService.create(mockUser, { type: 'residential' } as any);
            }).to.throw(ValidationError);
        });

        it('should default to residential if type is missing', () => {
            const result = JobService.create(mockUser, { name: 'Default Type Job' });
            expect(result.type).to.equal('residential');
        });
    });

    describe('getById()', () => {
        it('should retrieve an existing job', () => {
            const created = JobService.create(mockUser, { name: 'Retrieve Me' });
            const fetched = JobService.getById(created.id);

            expect(fetched).to.exist;
            expect(fetched.name).to.equal('Retrieve Me');
        });

        it('should throw NotFoundError for invalid ID', () => {
            expect(() => {
                JobService.getById(999999);
            }).to.throw(NotFoundError);
        });
    });

    describe('updateStage()', () => {
        it('should update the stage of an existing job', () => {
            const created = JobService.create(mockUser, { name: 'Stage Update Job' });
            expect(created.stage).to.equal('lead');

            const updated = JobService.update(mockUser, created.id, { stage: 'inspection' });
            expect(updated.stage).to.equal('inspection');
        });

        it('should throw NotFoundError if job does not exist', () => {
            expect(() => {
                JobService.update(mockUser, 999999, { stage: 'inspection' });
            }).to.throw(NotFoundError);
        });
    });

    describe('update()', () => {
        it('should partially update job fields', () => {
            const created = JobService.create(mockUser, { name: 'Original Name' });
            const updated = JobService.update(mockUser, created.id, { name: 'New Name', estimatedValue: 5000 });

            expect(updated.name).to.equal('New Name');
            expect(updated.estimatedValue).to.equal(5000);
            expect(updated.stage).to.equal('lead'); // untouched field should remain same
        });
    });
});
