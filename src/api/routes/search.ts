import { Router } from 'express';
import { SearchService } from '../../services/SearchService.ts';

export const searchRouter = Router();

searchRouter.get('/search', (req, res, next) => {
  try {
    const results = SearchService.globalSearch(String(req.query.q || ''));
    res.json(results);
  } catch (e) {
    next(e);
  }
});
