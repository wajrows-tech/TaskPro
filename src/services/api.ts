export * from './api/jobs.ts';
export * from './api/contacts.ts';
export * from './api/tasks.ts';
export * from './api/communications.ts';
export * from './api/finance.ts';
export * from './api/documents.ts';
export * from './api/ai.ts';
export * from './api/misc.ts';

import * as jobs from './api/jobs.ts';
import * as contacts from './api/contacts.ts';
import * as tasks from './api/tasks.ts';
import * as comms from './api/communications.ts';
import * as finance from './api/finance.ts';
import * as docs from './api/documents.ts';
import * as ai from './api/ai.ts';
import * as misc from './api/misc.ts';

export type { DashboardStats, SearchResults } from './api/misc.ts';

export const api = {
  ...jobs,
  ...contacts,
  ...tasks,
  ...comms,
  ...finance,
  ...docs,
  ...ai,
  ...misc,
};


 
 
