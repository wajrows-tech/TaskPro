import { db } from './connection.ts';

const sqlStrings = {
  // Jobs
  allJobs: 'SELECT * FROM jobs ORDER BY updatedAt DESC',
  jobById: 'SELECT * FROM jobs WHERE id = ?',
  jobContacts: `
    SELECT jc.id as jcId, jc.role as jcRole, c.*
    FROM job_contacts jc JOIN contacts c ON jc.contactId = c.id
    WHERE jc.jobId = ?
  `,
  jobTasks: 'SELECT * FROM tasks WHERE jobId = ? ORDER BY createdAt DESC',
  jobComms: 'SELECT * FROM communications WHERE jobId = ? ORDER BY createdAt DESC',
  jobDocs: 'SELECT * FROM documents WHERE jobId = ? ORDER BY createdAt DESC',
  jobEstimates: 'SELECT * FROM estimates WHERE jobId = ? ORDER BY createdAt DESC',

  // Contacts
  allContacts: 'SELECT * FROM contacts ORDER BY createdAt DESC',
  contactById: 'SELECT * FROM contacts WHERE id = ?',
  contactJobs: `
    SELECT jc.role as jcRole, j.id as jobId, j.name as jobName, j.jobNumber
    FROM job_contacts jc JOIN jobs j ON jc.jobId = j.id
    WHERE jc.contactId = ?
  `,

  // Tasks (with joins)
  allTasks: `
    SELECT t.*, j.name as jobName, j.jobNumber,
      c.firstName || ' ' || c.lastName as contactName
    FROM tasks t
    LEFT JOIN jobs j ON t.jobId = j.id
    LEFT JOIN contacts c ON t.contactId = c.id
    ORDER BY t.createdAt DESC
  `,
  taskById: 'SELECT * FROM tasks WHERE id = ?',
  subtasksByTask: 'SELECT * FROM subtasks WHERE taskId = ?',
  taskDeps: 'SELECT dependsOnTaskId FROM task_dependencies WHERE taskId = ?',
  taskStatusById: 'SELECT status FROM tasks WHERE id = ?',

  // Communications (with joins)
  allComms: `
    SELECT cm.*, j.name as jobName, j.jobNumber,
      c.firstName || ' ' || c.lastName as contactName
    FROM communications cm
    LEFT JOIN jobs j ON cm.jobId = j.id
    LEFT JOIN contacts c ON cm.contactId = c.id
    ORDER BY cm.createdAt DESC
  `,

  // Notes
  allNotes: 'SELECT * FROM notes ORDER BY createdAt DESC',

  // Stats
  countJobs: 'SELECT COUNT(*) as c FROM jobs',
  countActiveJobs: "SELECT COUNT(*) as c FROM jobs WHERE stage NOT IN ('complete','closed','canceled')",
  countTasks: 'SELECT COUNT(*) as c FROM tasks',
  countOpenTasks: "SELECT COUNT(*) as c FROM tasks WHERE status != 'done'",
  countContacts: 'SELECT COUNT(*) as c FROM contacts',
  pipelineValue: "SELECT COALESCE(SUM(estimatedValue),0) as v FROM jobs WHERE stage NOT IN ('complete','closed','canceled')",
  recentComms: "SELECT COUNT(*) as c FROM communications WHERE createdAt > datetime('now', '-7 days')",
  jobsByStage: "SELECT stage, COUNT(*) as count FROM jobs GROUP BY stage",

  // Search
  searchJobs: `
    SELECT id, jobNumber, name, address, stage, type, estimatedValue, assignedTo
    FROM jobs
    WHERE name LIKE ? OR address LIKE ? OR jobNumber LIKE ? OR assignedTo LIKE ?
    ORDER BY updatedAt DESC LIMIT 50
  `,
  searchContacts: `
    SELECT id, firstName, lastName, role, company, email, phone
    FROM contacts
    WHERE firstName LIKE ? OR lastName LIKE ? OR company LIKE ? OR email LIKE ? OR phone LIKE ?
    ORDER BY createdAt DESC LIMIT 50
  `,
};

const cache: Record<string, any> = {};

export const queries = new Proxy(sqlStrings, {
  get(target: any, prop: string) {
    if (typeof prop === 'string' && target[prop]) {
      if (!cache[prop]) {
        cache[prop] = db.prepare(target[prop]);
      }
      return cache[prop];
    }
    return Reflect.get(target, prop);
  }
}) as { [K in keyof typeof sqlStrings]: import('better-sqlite3').Statement };
 
 
