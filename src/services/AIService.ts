import { db, queries } from '../db/index.ts';
import { NotFoundError } from '../utils/errors.ts';

export class AIService {

    static getThreads() {
        return db.prepare('SELECT * FROM ai_threads ORDER BY updatedAt DESC').all();
    }

    static createThread(titleStr?: string) {
        const title = titleStr || 'New Chat';
        const result = db.prepare('INSERT INTO ai_threads (title) VALUES (?)').run(title);
        return db.prepare('SELECT * FROM ai_threads WHERE id = ?').get(result.lastInsertRowid);
    }

    static updateThread(id: number, title?: string) {
        if (title) {
            db.prepare('UPDATE ai_threads SET title = ?, updatedAt = datetime(\'now\') WHERE id = ?').run(title, id);
        }
        const thread = db.prepare('SELECT * FROM ai_threads WHERE id = ?').get(id);
        if (!thread) throw new NotFoundError('Thread not found');
        return thread;
    }

    static deleteThread(id: number) {
        db.prepare('DELETE FROM ai_conversations WHERE threadId = ?').run(id);
        const result = db.prepare('DELETE FROM ai_threads WHERE id = ?').run(id);
        if (result.changes === 0) throw new NotFoundError('Thread not found');
        return true;
    }

    static getMessages(threadId: number) {
        return db.prepare('SELECT * FROM ai_conversations WHERE threadId = ? ORDER BY createdAt ASC').all(threadId);
    }

    static addMessage(threadId: number | null, role: string, content: string, functionCalls?: any) {
        const result = db.prepare(
            'INSERT INTO ai_conversations (threadId, role, content, functionCalls) VALUES (?, ?, ?, ?)'
        ).run(threadId || null, role, content, functionCalls ? JSON.stringify(functionCalls) : null);

        if (threadId) {
            db.prepare('UPDATE ai_threads SET updatedAt = datetime(\'now\') WHERE id = ?').run(threadId);
        }

        return db.prepare('SELECT * FROM ai_conversations WHERE id = ?').get(result.lastInsertRowid);
    }

    static runAgentQuery(sql: string) {
        if (!sql.trim().toUpperCase().startsWith('SELECT')) {
            throw new Error('Only SELECT queries are allowed for safety constraints');
        }
        return db.prepare(sql).all();
    }

    static async chat(message: string, threadId?: number) {
        if (!message) throw new Error('Message is required');

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error('GEMINI_API_KEY not set in .env');

        // Dynamic import
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey });

        const jobs = (queries.allJobs?.all() || []) as any[];
        const tasks = (queries.allTasks?.all() || []) as any[];

        let history: any[] = [];
        if (threadId) {
            try {
                const msgs = db.prepare('SELECT role, content FROM ai_conversations WHERE threadId = ? ORDER BY createdAt ASC LIMIT 20').all(threadId) as any[];
                history = msgs.map(m => `[${m.role.toUpperCase()}]: ${m.content.slice(0, 300)}`);
            } catch { /* no history */ }
        }

        const jobsSummary = jobs.slice(0, 30).map((j: any) =>
            `[ID:${j.id}] "${j.name}" stage:${j.stage} value:$${j.estimatedValue || 0}`
        ).join('\n') || '(none)';

        const tasksSummary = tasks.slice(0, 30).map((t: any) =>
            `[ID:${t.id}] "${t.title}" status:${t.status} priority:${t.priority}`
        ).join('\n') || '(none)';

        const systemPrompt = `You are TaskPro AI — an omnipotent CRM assistant for a roofing company.
You have 7 sub-agents: Claims Strategist, Estimation Analyst, Photo Inspector, Ops Monitor, Comms Director, Scheduling Optimizer, Personal Assistant.

Current Jobs (${jobs.length}):
${jobsSummary}

Current Tasks (${tasks.length}):

${history.length > 0 ? `Recent conversation:\n${history.join('\n')}` : ''}

Be concise, direct, and helpful. Format in Markdown.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: message,
            config: { systemInstruction: systemPrompt },
        });

        const text = response.text || 'No response generated.';

        if (threadId) {
            try {
                db.prepare('INSERT INTO ai_conversations (role, content, threadId) VALUES (?, ?, ?)').run('assistant', text, threadId);
            } catch { /* ignore */ }
        }

        return text;
    }

    static getProactiveSuggestions() {
        const suggestions = [];

        const stagnantLeads = db.prepare(`
            SELECT j.*, c.firstName, c.lastName 
            FROM jobs j
            LEFT JOIN job_contacts jc ON j.id = jc.jobId
            LEFT JOIN contacts c ON jc.contactId = c.id
            WHERE j.stage = 'lead' 
            AND j.updatedAt < datetime('now', '-3 days')
            LIMIT 3
        `).all() as any[];

        for (const lead of stagnantLeads) {
            suggestions.push({
                id: `stagnant-${lead.id}`,
                type: 'warning',
                title: 'Stagnant Lead',
                body: `Follow up with ${lead.firstName || lead.name}. This lead hasn't been updated in 3 days.`,
                action: { label: 'Go to Job', navigate: 'job-detail', params: { jobId: lead.id } }
            });
        }

        const missingProduction = db.prepare(`
            SELECT * FROM jobs 
            WHERE (stage = 'in-progress' OR stage = 'approved')
            AND (shingleColor = '' OR actualStartDate IS NULL)
            LIMIT 2
        `).all() as any[];

        for (const job of missingProduction) {
            suggestions.push({
                id: `missing-prod-${job.id}`,
                type: 'info',
                title: 'Missing Production Info',
                body: `Job "${job.name}" is moving forward but lacks shingle color or start date.`,
                action: { label: 'Update Job', navigate: 'job-detail', params: { jobId: job.id } }
            });
        }

        const noTasks = db.prepare(`
            SELECT j.* 
            FROM jobs j
            LEFT JOIN tasks t ON j.id = t.jobId
            WHERE j.stage = 'approved'
            GROUP BY j.id
            HAVING COUNT(t.id) = 0
            LIMIT 2
        `).all() as any[];

        for (const job of noTasks) {
            suggestions.push({
                id: `no-tasks-${job.id}`,
                type: 'task',
                title: 'No Active Tasks',
                body: `Job "${job.name}" is approved but has no recorded tasks. Set up the production checklist.`,
                action: { label: 'Add Task', navigate: 'job-detail', params: { jobId: job.id } }
            });
        }

        return suggestions;
    }
}
