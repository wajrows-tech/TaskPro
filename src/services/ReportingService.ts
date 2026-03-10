import { db } from '../db/index.ts';

export interface DashboardStats {
    totalJobs: number;
    activeJobs: number;
    totalTasks: number;
    openTasks: number;
    totalContacts: number;
    pipelineValue: number;
    revenueCollected: number;
    recentComms: number;
    jobsByStage: { stage: string; count: number; value: number }[];
    repPerformance: { repName: string; jobCount: number; pipelineValue: number }[];
}

export class ReportingService {
    static getDashboardStats(): DashboardStats {
        // Core Counts
        const totalJobs = (db.prepare('SELECT COUNT(*) as c FROM jobs').get() as any).c || 0;
        const activeJobs = (db.prepare("SELECT COUNT(*) as c FROM jobs WHERE stage NOT IN ('complete','closed','canceled')").get() as any).c || 0;
        const totalTasks = (db.prepare('SELECT COUNT(*) as c FROM tasks').get() as any).c || 0;
        const openTasks = (db.prepare("SELECT COUNT(*) as c FROM tasks WHERE status != 'done'").get() as any).c || 0;
        const totalContacts = (db.prepare('SELECT COUNT(*) as c FROM contacts').get() as any).c || 0;
        const recentComms = (db.prepare("SELECT COUNT(*) as c FROM communications WHERE createdAt > datetime('now', '-7 days')").get() as any).c || 0;

        // Financials
        const pipelineValue = (db.prepare("SELECT COALESCE(SUM(estimatedValue),0) as v FROM jobs WHERE stage NOT IN ('complete','closed','canceled')").get() as any).v || 0;
        const revenueCollected = (db.prepare("SELECT COALESCE(SUM(amount), 0) as v FROM payments WHERE status = 'completed'").get() as any).v || 0;

        // Stage Aggregations
        const jobsByStage = db.prepare(`
            SELECT stage, COUNT(*) as count, COALESCE(SUM(estimatedValue), 0) as value
            FROM jobs 
            GROUP BY stage
        `).all() as { stage: string; count: number; value: number }[];

        // Rep Performance (using assignedTo for now)
        const repPerformance = db.prepare(`
            SELECT assignedTo as repName, COUNT(*) as jobCount, COALESCE(SUM(estimatedValue), 0) as pipelineValue
            FROM jobs 
            WHERE assignedTo IS NOT NULL AND assignedTo != ''
            GROUP BY assignedTo
            ORDER BY pipelineValue DESC
            LIMIT 5
        `).all() as { repName: string; jobCount: number; pipelineValue: number }[];

        return {
            totalJobs,
            activeJobs,
            totalTasks,
            openTasks,
            totalContacts,
            pipelineValue,
            revenueCollected,
            recentComms,
            jobsByStage,
            repPerformance
        };
    }
}
 
 
