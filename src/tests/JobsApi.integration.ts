import request from 'supertest';
import { expect } from 'chai';
import express from 'express';
import { db } from '../db/index.ts';
import { apiRouter as router } from '../api/index.ts';
import { errorHandler } from '../api/middlewares/errorHandler.ts';
import { UserService } from '../services/UserService.ts';
import { AuthService } from '../services/AuthService.ts';

const app = express();
app.use(express.json());
app.use('/api', router);
app.use(errorHandler);

describe('Jobs API Integration', () => {
    let authToken: string;

    before(() => {
        db.exec('DELETE FROM jobs');
        db.exec('DELETE FROM sessions');
        db.exec('DELETE FROM users');
        UserService.create({ email: 'test@api.local', password: 'password123', firstName: 'API', lastName: 'Test', role: 'admin' });
        const { token } = AuthService.login('test@api.local', 'password123');
        authToken = token;
    });

    afterEach(() => {
        db.exec('DELETE FROM jobs');
    });

    let jobId: number;

    describe('POST /api/jobs', () => {
        it('should create a job and return 201', async () => {
            const res = await request(app)
                .post('/api/jobs')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ name: 'Integration Test Job', type: 'commercial' });

            expect(res.status).to.equal(201);
            expect(res.body.name).to.equal('Integration Test Job');
            expect(res.body.type).to.equal('commercial');
            expect(res.body.stage).to.equal('lead');

            jobId = res.body.id;
        });

        it('should return 400 for invalid data', async () => {
            const res = await request(app)
                .post('/api/jobs')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ type: 'commercial' }); // Missing name

            expect(res.status).to.equal(400);
            expect(res.body).to.have.property('status', 'error');
            expect(res.body.message).to.include('Job name is required');
        });
    });

    describe('GET /api/jobs', () => {
        beforeEach(async () => {
            await request(app).post('/api/jobs').set('Authorization', `Bearer ${authToken}`).send({ name: 'Job 1' });
            await request(app).post('/api/jobs').set('Authorization', `Bearer ${authToken}`).send({ name: 'Job 2' });
        });

        it('should return a list of jobs', async () => {
            const res = await request(app).get('/api/jobs').set('Authorization', `Bearer ${authToken}`);
            expect(res.status).to.equal(200);
            expect(res.body).to.be.an('array');
            expect(res.body.length).to.be.at.least(2);
        });
    });

    describe('GET /api/jobs/:id', () => {
        beforeEach(async () => {
            const res = await request(app).post('/api/jobs').set('Authorization', `Bearer ${authToken}`).send({ name: 'Fetch Me' });
            jobId = res.body.id;
        });

        it('should fetch a specific job by ID', async () => {
            const res = await request(app).get(`/api/jobs/${jobId}`).set('Authorization', `Bearer ${authToken}`);
            expect(res.status).to.equal(200);
            expect(res.body.name).to.equal('Fetch Me');
        });

        it('should return 404 for non-existent job', async () => {
            const res = await request(app).get('/api/jobs/999999').set('Authorization', `Bearer ${authToken}`);
            expect(res.status).to.equal(404);
            expect(res.body.message).to.include('Job with ID 999999 not found');
        });
    });
});
