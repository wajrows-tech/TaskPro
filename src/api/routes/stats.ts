import { Router } from 'express';
import { ReportingService } from '../../services/ReportingService.ts';

export const statsRouter = Router();

statsRouter.get('/stats', (req, res) => {
    try {
        const stats = ReportingService.getDashboardStats();
        res.json(stats);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});
 
 
