import { Router } from 'express';

// Import local routers
import { jobRouter } from './routes/jobs.ts';
import { contactRouter } from './routes/contacts.ts';
import { taskRouter } from './routes/tasks.ts';
import { communicationRouter } from './routes/communications.ts';
import { documentRouter } from './routes/documents.ts';
import { estimateRouter } from './routes/estimates.ts';
import { noteRouter } from './routes/notes.ts';
import { aiRouter } from './routes/ai.ts';
import { searchRouter } from './routes/search.ts';
import { statsRouter } from './routes/stats.ts';
import { agentRouter } from './routes/agents.ts';
import { authRouter } from './routes/auth.ts';
import { automationRouter } from './routes/automations.ts';
import { threadRouter } from './routes/threads.ts';
import { financeRouter } from './routes/finance.ts';
import { productionRouter } from './routes/production.ts';
import { portalRouter } from './routes/portal.ts';
import { syncRouter } from './routes/sync.ts';
import { errorHandler } from './middlewares/errorHandler.ts';
import { requestContextMiddleware } from './middlewares/requestContext.ts';
import { requestLogger } from './middlewares/requestLogger.ts';
import { globalRateLimiter } from './middlewares/security.ts';

// Import integrations router (keeps its own directory structure)
import { integrationRouter } from '../integrations/routes.ts';

export const apiRouter = Router();

// Core Tracking Infrastructure
apiRouter.use(globalRateLimiter);
apiRouter.use(requestContextMiddleware);
apiRouter.use(requestLogger);

// Middleware inside the root router to ensure clean JSON responses without caching
apiRouter.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Content-Type', 'application/json');
    next();
});

// Wire up the domains
apiRouter.use('/', jobRouter);
apiRouter.use('/', contactRouter);
apiRouter.use('/', taskRouter);
apiRouter.use('/', communicationRouter);
apiRouter.use('/', documentRouter);
apiRouter.use('/', estimateRouter);
apiRouter.use('/', noteRouter);
apiRouter.use('/', aiRouter);
apiRouter.use('/', searchRouter);
apiRouter.use('/', statsRouter);
apiRouter.use('/', agentRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use(automationRouter);
apiRouter.use(threadRouter);
apiRouter.use(financeRouter);
apiRouter.use(productionRouter);
apiRouter.use('/portal', portalRouter);
apiRouter.use(syncRouter);

// Integrations routes directly mounted
apiRouter.use('/', integrationRouter);

// Centralized Error Handling - MUST be last
apiRouter.use(errorHandler);
 
 
