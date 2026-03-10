import { db, queries } from '../db/index.ts';

export class SearchService {
    static globalSearch(query: string) {
        const q = String(query || '').trim();
        if (!q) return { jobs: [], contacts: [], tasks: [], communications: [] };

        const like = `%${q}%`;
        const jobs = queries.searchJobs.all(like, like, like, like);
        const contacts = queries.searchContacts.all(like, like, like, like, like);

        const tasks = db.prepare(`
            SELECT t.id, t.title, t.status, t.priority, t.scheduledDate, j.name as jobName
            FROM tasks t LEFT JOIN jobs j ON t.jobId = j.id
            WHERE t.title LIKE ? OR t.description LIKE ? OR t.assignedTo LIKE ?
            ORDER BY t.createdAt DESC LIMIT 25
        `).all(like, like, like);

        const communications = db.prepare(`
            SELECT cm.id, cm.channel, cm.subject, cm.body, cm.createdAt, j.name as jobName
            FROM communications cm LEFT JOIN jobs j ON cm.jobId = j.id
            WHERE cm.subject LIKE ? OR cm.body LIKE ?
            ORDER BY cm.createdAt DESC LIMIT 25
        `).all(like, like);

        return { jobs, contacts, tasks, communications };
    }
}
 
 
