import { db, queries, generateJobNumber } from '../db/index.ts';
import { eventBus } from '../agents/index.ts';
import { validate, buildUpdate, VALID_STAGES, VALID_JOB_TYPES } from '../api/utils.ts';
import { NotFoundError, ValidationError } from '../utils/errors.ts';
import type { Job, JobStage, JobType } from '../types.ts';
import type { User } from './UserService.ts';

/**
 * Domain Service for Managing Jobs.
 * Houses all business logic, validation, state transitions, and database orchestration.
 */
export class JobService {

    static getAll() {
        return queries.allJobs.all();
    }

    static getById(id: number) {
        const job = queries.jobById.get(id);
        if (!job) throw new NotFoundError(`Job with ID ${id} not found`);

        const contacts = queries.jobContacts.all(id);
        const tasks = queries.jobTasks.all(id);
        const comms = queries.jobComms.all(id);
        const docs = queries.jobDocs.all(id);
        const estimates = queries.jobEstimates.all(id);

        return { ...(job as any), contacts, tasks, communications: comms, documents: docs, estimates };
    }

    static create(user: User, data: Partial<Job>) {
        if (!data.name?.trim()) {
            throw new ValidationError('Job name is required');
        }

        const jobNumber = generateJobNumber();
        const stage = validate(data.stage, VALID_STAGES, 'stage', 'lead');
        const type = validate(data.type, VALID_JOB_TYPES, 'type', 'residential');

        const result = db.prepare(`
        INSERT INTO jobs (
            jobNumber, name, address, city, state, zip, stage, type, estimatedValue, 
            insuranceClaim, deductible, assignedTo, description, roofType, source,
            contractAmount, actualCost, amountPaid, leadDate, soldDate,
            scheduledStartDate, actualStartDate, completionDate, squareFootage,
            roofPitch, layers, shingleColor, trades, permitNumber, gateCode,
            lockboxCode, dumpsterLocation, specialInstructions, workflowTags,
            salesRepId, projectManagerId, crewName, ownerId, createdById
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            jobNumber, data.name, data.address || '', data.city || '', data.state || '', data.zip || '', stage, type, data.estimatedValue || 0,
            data.insuranceClaim || '', data.deductible || 0, data.assignedTo || '', data.description || '', data.roofType || '', data.source || '',
            data.contractAmount || 0, data.actualCost || 0, data.amountPaid || 0, data.leadDate || '', data.soldDate || '',
            data.scheduledStartDate || '', data.actualStartDate || '', data.completionDate || '', data.squareFootage || 0,
            data.roofPitch || '', data.layers || 0, data.shingleColor || '', data.trades || '[]', data.permitNumber || '', data.gateCode || '',
            data.lockboxCode || '', data.dumpsterLocation || '', data.specialInstructions || '', data.workflowTags || '[]',
            data.salesRepId || null, data.projectManagerId || null, data.crewName || '', user.id, user.id
        );

        const newJobId = Number(result.lastInsertRowid);
        const job = queries.jobById.get(newJobId) as any;

        console.log(`[JobService] Created job: ${jobNumber} - ${data.name}`);

        // Orchestration trigger point
        eventBus.fire('job.created', 'job', newJobId, { name: data.name, stage, type, jobNumber }, 'user');

        return job;
    }

    static update(user: User, id: number, data: Partial<Job>) {
        const job = queries.jobById.get(id);
        if (!job) throw new NotFoundError(`Job with ID ${id} not found`);

        if (data.stage) data.stage = validate(data.stage, VALID_STAGES, 'stage') as JobStage;
        if (data.type) data.type = validate(data.type, VALID_JOB_TYPES, 'type') as JobType;

        const fields = [
            'name', 'address', 'city', 'state', 'zip', 'stage', 'type', 'estimatedValue',
            'insuranceClaim', 'deductible', 'assignedTo', 'description', 'roofType', 'source',
            'contractAmount', 'actualCost', 'amountPaid', 'leadDate', 'soldDate',
            'scheduledStartDate', 'actualStartDate', 'completionDate', 'squareFootage',
            'roofPitch', 'layers', 'shingleColor', 'trades', 'permitNumber', 'gateCode',
            'lockboxCode', 'dumpsterLocation', 'specialInstructions', 'workflowTags',
            'salesRepId', 'projectManagerId', 'crewName', 'ownerId'
        ];

        const oldJob = job as any;

        const updateData: any = { ...data, updatedById: user.id };
        buildUpdate('jobs', id, updateData, [...fields, 'updatedById']);

        const updated = queries.jobById.get(id) as any;

        // Strict state transition trigger
        if (data.stage && data.stage !== oldJob.stage) {
            eventBus.fire('job.stage_changed', 'job', id, { oldStage: oldJob.stage, newStage: data.stage, name: updated.name }, 'user');
        }

        eventBus.fire('job.updated', 'job', id, data, 'user');

        return updated;
    }

    static delete(id: number) {
        const result = db.prepare('DELETE FROM jobs WHERE id = ?').run(id);
        if (result.changes === 0) {
            throw new NotFoundError(`Job with ID ${id} not found`);
        }
        return true;
    }
}
 
