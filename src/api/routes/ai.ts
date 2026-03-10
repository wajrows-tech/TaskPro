import { Router } from 'express';
import { AIService } from '../../services/AIService.ts';

export const aiRouter = Router();

aiRouter.get('/ai-threads', (req, res, next) => {
    try {
        const threads = AIService.getThreads();
        res.json(threads);
    } catch (e) { next(e); }
});

aiRouter.post('/ai-threads', (req, res, next) => {
    try {
        const title = req.body.title || 'New Chat';
        const thread = AIService.createThread(title);
        res.json(thread);
    } catch (e) { next(e); }
});

aiRouter.put('/ai-threads/:id', (req, res, next) => {
    try {
        const { title } = req.body;
        const thread = AIService.updateThread(Number(req.params.id), title);
        res.json(thread);
    } catch (e) { next(e); }
});

aiRouter.delete('/ai-threads/:id', (req, res, next) => {
    try {
        AIService.deleteThread(Number(req.params.id));
        res.json({ success: true });
    } catch (e) { next(e); }
});

aiRouter.get('/ai-threads/:id/messages', (req, res, next) => {
    try {
        const messages = AIService.getMessages(Number(req.params.id));
        res.json(messages);
    } catch (e) { next(e); }
});

aiRouter.post('/ai-conversations', (req, res, next) => {
    try {
        const { threadId, role, content, functionCalls } = req.body;
        const msg = AIService.addMessage(threadId, role, content, functionCalls);
        res.json(msg);
    } catch (e) { next(e); }
});

// ── AI Query (raw SQL for AI agent) ──
aiRouter.post('/ai-query', (req, res, next) => {
    try {
        const { sql } = req.body;
        if (!sql) return res.status(400).json({ error: 'sql is required' });

        const results = AIService.runAgentQuery(sql);
        res.json(results);
    } catch (e) { next(e); }
});

// ── Shared CRM/Agent awareness for ChatGPT endpoints ──
aiRouter.post('/ai-chat', async (req, res, next) => {
    try {
        const { message, threadId } = req.body;
        const text = await AIService.chat(message, threadId ? Number(threadId) : undefined);
        res.json({ response: text });
    } catch (e: any) {
        console.error('[ai-chat] Error:', e.message);
        next(e);
    }
});

// ── Proactive Suggestions ──
aiRouter.get('/ai/suggestions', (req, res, next) => {
    try {
        const suggestions = AIService.getProactiveSuggestions();
        res.json(suggestions);
    } catch (e) { next(e); }
});

 
 
