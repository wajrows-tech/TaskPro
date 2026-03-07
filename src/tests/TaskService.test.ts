import { expect } from 'chai';
import { db } from '../db/index.ts';
import { TaskService } from '../services/TaskService.ts';
import { JobService } from '../services/JobService.ts';
import { ValidationError, NotFoundError } from '../utils/errors.ts';
import { UserService } from '../services/UserService.ts';

describe('TaskService', () => {
    let jobId: number;
    let mockUser: any;

    before(() => {
        db.exec('DELETE FROM users');
        mockUser = UserService.create({ email: 'task_test@taskpro.local', password: 'password', firstName: 'Admin', lastName: 'User', role: 'admin' });
        db.exec('DELETE FROM tasks');
        db.exec('DELETE FROM jobs');
    });

    afterEach(() => {
        db.exec('DELETE FROM tasks');
        db.exec('DELETE FROM jobs');
    });

    beforeEach(() => {
        const job = JobService.create(mockUser, { name: 'Task Test Job' });
        jobId = job.id;
    });

    describe('create()', () => {
        it('should create a new task successfully', () => {
            const task = TaskService.create(mockUser, {
                title: 'Order Materials',
                jobId: jobId,
                status: 'todo',
                priority: 'high'
            });

            expect(task).to.exist;
            expect(task.id).to.be.greaterThan(0);
            expect(task.title).to.equal('Order Materials');
            expect(task.jobId).to.equal(jobId);
            expect(task.status).to.equal('todo');
            expect(task.priority).to.equal('high');
        });

        it('should throw ValidationError if title is missing', () => {
            expect(() => {
                TaskService.create(mockUser, { jobId, status: 'todo' } as any);
            }).to.throw(ValidationError);
        });

        it('should apply default status and priority if omitted', () => {
            const task = TaskService.create(mockUser, { title: 'Basic Task' });
            expect(task.status).to.equal('todo');
            expect(task.priority).to.equal('medium');
        });
    });

    describe('update()', () => {
        it('should update an existing task', () => {
            const task = TaskService.create(mockUser, { title: 'Initial Title', jobId });
            const updated = TaskService.update(mockUser, task.id, { title: 'Updated Title', status: 'done' });

            expect(updated.title).to.equal('Updated Title');
            expect(updated.status).to.equal('done');
        });

        it('should throw NotFoundError for invalid task ID', () => {
            expect(() => {
                TaskService.update(mockUser, 9999, { title: 'New' });
            }).to.throw(NotFoundError);
        });
    });

    describe('delete()', () => {
        it('should delete a task', () => {
            const task = TaskService.create(mockUser, { title: 'To Be Deleted' });
            const success = TaskService.delete(task.id);
            expect(success).to.be.true;

            expect(() => TaskService.getById(task.id)).to.throw(NotFoundError);
        });
    });
});
