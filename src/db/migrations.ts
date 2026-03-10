import { db } from './connection.ts';

function getCurrentVersion(): number {
    // Ensure the tracking table exists
    db.exec(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            version INTEGER NOT NULL UNIQUE,
            description TEXT NOT NULL,
            applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Backwards compatibility sync: check what PRAGMA user_version says
    const pragmaResult = db.prepare('PRAGMA user_version').get() as { user_version: number };
    const maxLegacyVersion = Number(pragmaResult?.user_version);

    // Get the max version from the new tracking table
    const result = db.prepare('SELECT MAX(version) as version FROM schema_migrations').get() as { version: number | null };
    const trackingVersion = result.version || 0;

    // If they have legacy PRAGMA versions that aren't tracked, backfill them.
    if (!isNaN(maxLegacyVersion) && maxLegacyVersion > trackingVersion) {
        console.log(`[Migrations] Syncing legacy PRAGMA version ${maxLegacyVersion} into schema_migrations table...`);
        for (let v = trackingVersion + 1; v <= maxLegacyVersion; v++) {
            const description = migrations.find(m => m.version === v)?.description || `Legacy migration v${v}`;
            markVersion(v, description);
        }
        return maxLegacyVersion;
    }

    return trackingVersion;
}

function markVersion(version: number, description: string) {
    db.prepare('INSERT OR IGNORE INTO schema_migrations (version, description) VALUES (?, ?)').run(version, description);
    db.exec(`PRAGMA user_version = ${version} `);
}

function tableHasColumn(table: string, column: string): boolean {
    try {
        const cols = db.prepare(`PRAGMA table_info(${table})`).all() as any[];
        return cols.some(c => c.name === column);
    } catch {
        return false;
    }
}

function tableExists(table: string): boolean {
    try {
        const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table) as any;
        return !!row;
    } catch {
        return false;
    }
}

const migrations: { version: number; description: string; run: () => void }[] = [
    {
        version: 1,
        description: 'Rebuild communications: drop clientId NOT NULL, remove legacy columns',
        run: () => {
            if (!tableHasColumn('communications', 'clientId')) return;
            console.log('[migration 1] Rebuilding communications table...');
            db.exec(`
        CREATE TABLE communications_new(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                jobId INTEGER REFERENCES jobs(id) ON DELETE SET NULL,
                contactId INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
                channel TEXT DEFAULT 'note',
                direction TEXT DEFAULT 'outbound',
                subject TEXT DEFAULT '',
                body TEXT NOT NULL DEFAULT '',
                scheduledAt DATETIME,
                sentAt DATETIME,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        INSERT INTO communications_new(id, jobId, contactId, channel, direction, subject, body, scheduledAt, sentAt, createdAt)
        SELECT id, COALESCE(jobId, clientId), contactId, COALESCE(channel, type, 'note'), COALESCE(direction, 'outbound'), COALESCE(subject, ''), COALESCE(body, content, ''), scheduledAt, sentAt, createdAt FROM communications;
        DROP TABLE communications;
        ALTER TABLE communications_new RENAME TO communications;
            `);
            console.log('[migration 1] ✅ Communications table rebuilt');
        }
    },
    {
        version: 2,
        description: 'Rebuild contacts: drop legacy name/type/specialty columns',
        run: () => {
            if (!tableHasColumn('contacts', 'specialty')) return;
            console.log('[migration 2] Rebuilding contacts table...');
            db.exec(`
        CREATE TABLE contacts_new(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                firstName TEXT NOT NULL DEFAULT '',
                lastName TEXT DEFAULT '',
                role TEXT DEFAULT 'homeowner',
                company TEXT DEFAULT '',
                email TEXT DEFAULT '',
                phone TEXT DEFAULT '',
                address TEXT DEFAULT '',
                notes TEXT DEFAULT '',
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        INSERT INTO contacts_new(id, firstName, lastName, role, company, email, phone, address, notes, createdAt)
        SELECT id, COALESCE(firstName, CASE WHEN name IS NOT NULL AND name != '' THEN SUBSTR(name, 1, INSTR(name || ' ', ' ') - 1) ELSE '' END), COALESCE(lastName, CASE WHEN name IS NOT NULL AND name != '' AND INSTR(name, ' ') > 0 THEN SUBSTR(name, INSTR(name, ' ') + 1) ELSE '' END), COALESCE(role, type, 'homeowner'), COALESCE(company, ''), COALESCE(email, ''), COALESCE(phone, ''), COALESCE(address, ''), COALESCE(notes, specialty, ''), createdAt FROM contacts;
        DROP TABLE contacts;
        ALTER TABLE contacts_new RENAME TO contacts;
            `);
            console.log('[migration 2] ✅ Contacts table rebuilt');
        }
    },
    {
        version: 3,
        description: 'Rebuild tasks: drop clientId/isFrog/frogName/icon/jobName',
        run: () => {
            if (!tableHasColumn('tasks', 'clientId') && !tableHasColumn('tasks', 'isFrog')) return;
            console.log('[migration 3] Rebuilding tasks table...');
            db.exec(`
        CREATE TABLE tasks_new(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                jobId INTEGER REFERENCES jobs(id) ON DELETE SET NULL,
                contactId INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
                title TEXT NOT NULL,
                description TEXT DEFAULT '',
                status TEXT DEFAULT 'todo',
                priority TEXT DEFAULT 'medium',
                action TEXT DEFAULT 'other',
                assignedTo TEXT DEFAULT '',
                scheduledDate TEXT DEFAULT '',
                startTime TEXT DEFAULT '',
                duration INTEGER DEFAULT 60,
                waitingOn TEXT DEFAULT '',
                isAutoGenerated INTEGER DEFAULT 0,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        INSERT INTO tasks_new(id, jobId, contactId, title, description, status, priority, action, assignedTo, scheduledDate, startTime, duration, waitingOn, isAutoGenerated, createdAt, updatedAt)
        SELECT id, COALESCE(jobId, clientId), contactId, title, COALESCE(description, ''), COALESCE(status, 'todo'), COALESCE(priority, 'medium'), COALESCE(action, 'other'), COALESCE(assignedTo, ''), COALESCE(scheduledDate, ''), COALESCE(startTime, ''), COALESCE(duration, 60), COALESCE(waitingOn, ''), COALESCE(isAutoGenerated, 0), createdAt, updatedAt FROM tasks;
        DROP TABLE tasks;
        ALTER TABLE tasks_new RENAME TO tasks;
            `);
            console.log('[migration 3] ✅ Tasks table rebuilt');
        }
    },
    {
        version: 4,
        description: 'Rebuild notes: drop clientId',
        run: () => {
            if (!tableHasColumn('notes', 'clientId')) return;
            console.log('[migration 4] Rebuilding notes table...');
            db.exec(`
        CREATE TABLE notes_new(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                jobId INTEGER REFERENCES jobs(id) ON DELETE SET NULL,
                contactId INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
                content TEXT NOT NULL,
                type TEXT DEFAULT 'general',
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        INSERT INTO notes_new(id, jobId, contactId, content, type, createdAt)
        SELECT id, COALESCE(jobId, clientId), contactId, content, COALESCE(type, 'general'), createdAt FROM notes;
        DROP TABLE notes;
        ALTER TABLE notes_new RENAME TO notes;
            `);
            console.log('[migration 4] ✅ Notes table rebuilt');
        }
    },
    {
        version: 5,
        description: 'Drop legacy tables: clients, task_contacts, frog_hall_of_fame',
        run: () => {
            for (const table of ['clients', 'task_contacts', 'frog_hall_of_fame']) {
                if (tableExists(table)) {
                    console.log(`[migration 5] Dropping table: ${table} `);
                    db.exec(`DROP TABLE IF EXISTS ${table} `);
                }
            }
            console.log('[migration 5] ✅ Legacy tables dropped');
        }
    },
    {
        version: 6,
        description: 'Add performance indexes on foreign keys and query columns',
        run: () => {
            console.log('[migration 6] Creating indexes...');
            const indexes = [
                'CREATE INDEX IF NOT EXISTS idx_jobs_stage ON jobs(stage)',
                'CREATE INDEX IF NOT EXISTS idx_jobs_updatedAt ON jobs(updatedAt)',
                'CREATE INDEX IF NOT EXISTS idx_jobs_assignedTo ON jobs(assignedTo)',
                'CREATE INDEX IF NOT EXISTS idx_contacts_role ON contacts(role)',
                'CREATE INDEX IF NOT EXISTS idx_contacts_lastName ON contacts(lastName)',
                'CREATE INDEX IF NOT EXISTS idx_tasks_jobId ON tasks(jobId)',
                'CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)',
                'CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority)',
                'CREATE INDEX IF NOT EXISTS idx_tasks_scheduledDate ON tasks(scheduledDate)',
                'CREATE INDEX IF NOT EXISTS idx_tasks_assignedTo ON tasks(assignedTo)',
                'CREATE INDEX IF NOT EXISTS idx_comms_jobId ON communications(jobId)',
                'CREATE INDEX IF NOT EXISTS idx_comms_contactId ON communications(contactId)',
                'CREATE INDEX IF NOT EXISTS idx_comms_channel ON communications(channel)',
                'CREATE INDEX IF NOT EXISTS idx_comms_createdAt ON communications(createdAt)',
                'CREATE INDEX IF NOT EXISTS idx_notes_jobId ON notes(jobId)',
                'CREATE INDEX IF NOT EXISTS idx_notes_type ON notes(type)',
                'CREATE INDEX IF NOT EXISTS idx_notes_createdAt ON notes(createdAt)',
                'CREATE INDEX IF NOT EXISTS idx_estimates_jobId ON estimates(jobId)',
                'CREATE INDEX IF NOT EXISTS idx_estimates_status ON estimates(status)',
                'CREATE INDEX IF NOT EXISTS idx_job_contacts_jobId ON job_contacts(jobId)',
                'CREATE INDEX IF NOT EXISTS idx_job_contacts_contactId ON job_contacts(contactId)',
                'CREATE INDEX IF NOT EXISTS idx_subtasks_taskId ON subtasks(taskId)',
                'CREATE INDEX IF NOT EXISTS idx_task_deps_taskId ON task_dependencies(taskId)',
                'CREATE INDEX IF NOT EXISTS idx_task_deps_depId ON task_dependencies(dependsOnTaskId)',
                'CREATE INDEX IF NOT EXISTS idx_docs_jobId ON documents(jobId)',
                'CREATE INDEX IF NOT EXISTS idx_ai_conv_threadId ON ai_conversations(threadId)',
            ];
            for (const sql of indexes) {
                try { db.exec(sql); } catch (e: any) { /* index may already exist */ }
            }
            console.log(`[migration 6] ✅ ${indexes.length} indexes created`);
        }
    },
    {
        version: 7,
        description: 'Add updatedAt auto-update triggers',
        run: () => {
            console.log('[migration 7] Creating triggers...');
            const triggers = [
                `CREATE TRIGGER IF NOT EXISTS trg_jobs_updated AFTER UPDATE ON jobs
         FOR EACH ROW BEGIN UPDATE jobs SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id; END`,
                `CREATE TRIGGER IF NOT EXISTS trg_tasks_updated AFTER UPDATE ON tasks
         FOR EACH ROW BEGIN UPDATE tasks SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id; END`,
                `CREATE TRIGGER IF NOT EXISTS trg_estimates_updated AFTER UPDATE ON estimates
         FOR EACH ROW BEGIN UPDATE estimates SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id; END`,
                `CREATE TRIGGER IF NOT EXISTS trg_ai_threads_updated AFTER UPDATE ON ai_threads
         FOR EACH ROW BEGIN UPDATE ai_threads SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id; END`,
            ];
            for (const sql of triggers) {
                try { db.exec(sql); } catch (e: any) { console.warn('[migration 7] Trigger warning:', e.message); }
            }
            console.log('[migration 7] ✅ Triggers created');
        }
    },
    {
        version: 8,
        description: 'Add agent memory, audit log, and rules tables for the agentic platform',
        run: () => {
            console.log('[migration 8] Creating agent system tables...');
            db.exec(`
        CREATE TABLE IF NOT EXISTS agent_memory(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                agentId TEXT NOT NULL,
                memoryType TEXT NOT NULL DEFAULT 'learning',
                key TEXT NOT NULL,
                value TEXT NOT NULL DEFAULT '{}',
                confidence REAL DEFAULT 0.5 CHECK(confidence >= 0 AND confidence <= 1),
                accessCount INTEGER DEFAULT 0,
                lastAccessedAt DATETIME,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(agentId, memoryType, key)
            );
        CREATE TABLE IF NOT EXISTS agent_audit_log(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                agentId TEXT NOT NULL,
                action TEXT NOT NULL,
                params TEXT DEFAULT '{}',
                result TEXT DEFAULT '{}',
                confidence REAL DEFAULT 0,
                autonomyLevel TEXT DEFAULT 'observe',
                approved INTEGER DEFAULT 1,
                thinkingSteps TEXT DEFAULT '[]',
                parentRequestId TEXT,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        CREATE TABLE IF NOT EXISTS agent_rules(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                agentId TEXT NOT NULL,
                name TEXT NOT NULL,
                description TEXT DEFAULT '',
                triggerEvent TEXT NOT NULL,
                conditions TEXT DEFAULT '[]',
                actionType TEXT NOT NULL,
                actionParams TEXT DEFAULT '{}',
                cooldownMinutes INTEGER DEFAULT 60,
                lastFiredAt DATETIME,
                enabled INTEGER DEFAULT 1,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        CREATE INDEX IF NOT EXISTS idx_agent_memory_lookup ON agent_memory(agentId, memoryType);
        CREATE INDEX IF NOT EXISTS idx_agent_memory_key ON agent_memory(agentId, key);
        CREATE INDEX IF NOT EXISTS idx_agent_memory_confidence ON agent_memory(agentId, confidence DESC);
        CREATE INDEX IF NOT EXISTS idx_agent_audit_agent ON agent_audit_log(agentId);
        CREATE INDEX IF NOT EXISTS idx_agent_audit_action ON agent_audit_log(action);
        CREATE INDEX IF NOT EXISTS idx_agent_audit_created ON agent_audit_log(createdAt);
        CREATE INDEX IF NOT EXISTS idx_agent_rules_agent ON agent_rules(agentId);
        CREATE INDEX IF NOT EXISTS idx_agent_rules_event ON agent_rules(triggerEvent);
            `);
            console.log('[migration 8] ✅ Agent system tables created (agent_memory, agent_audit_log, agent_rules)');
        }
    },
    {
        version: 9,
        description: 'Integrations: create registry, sync state, and event tables',
        run: () => {
            db.exec(`
        CREATE TABLE IF NOT EXISTS integrations(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                integrationId TEXT NOT NULL UNIQUE,
                enabled INTEGER DEFAULT 0,
                credentials TEXT DEFAULT '{}',
                settings TEXT DEFAULT '{}',
                syncRules TEXT DEFAULT '[]',
                lastSyncAt DATETIME,
                lastHealthCheck TEXT DEFAULT '{}',
                lastError TEXT,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        CREATE TABLE IF NOT EXISTS integration_events(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                integrationId TEXT NOT NULL,
                eventType TEXT NOT NULL,
                direction TEXT DEFAULT 'outbound',
                entityType TEXT,
                entityId INTEGER,
                payload TEXT DEFAULT '{}',
                status TEXT DEFAULT 'success',
                errorMessage TEXT,
                idempotencyKey TEXT,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        CREATE TABLE IF NOT EXISTS integration_sync_state(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                integrationId TEXT NOT NULL,
                entityType TEXT NOT NULL,
                lastSyncAt DATETIME,
                lastExternalCursor TEXT,
                recordsSynced INTEGER DEFAULT 0,
                UNIQUE(integrationId, entityType)
            );
        CREATE INDEX IF NOT EXISTS idx_integrations_id ON integrations(integrationId);
        CREATE INDEX IF NOT EXISTS idx_integration_events_id ON integration_events(integrationId);
        CREATE INDEX IF NOT EXISTS idx_integration_events_type ON integration_events(eventType);
        CREATE INDEX IF NOT EXISTS idx_integration_events_created ON integration_events(createdAt);
        CREATE INDEX IF NOT EXISTS idx_integration_sync_lookup ON integration_sync_state(integrationId, entityType);
            `);
            console.log('[migration 9] ✅ Integrations system tables created');
        }
    },
    {
        version: 10,
        description: 'Phase 7: Massive database enrichment for Jobs and Communications',
        run: () => {
            console.log('[migration 10] Expanding jobs and communications tables...');
            const jobCols = [
                { name: 'contractAmount', type: 'REAL DEFAULT 0' },
                { name: 'actualCost', type: 'REAL DEFAULT 0' },
                { name: 'amountPaid', type: 'REAL DEFAULT 0' },
                { name: 'leadDate', type: 'DATETIME' },
                { name: 'soldDate', type: 'DATETIME' },
                { name: 'scheduledStartDate', type: 'DATETIME' },
                { name: 'actualStartDate', type: 'DATETIME' },
                { name: 'completionDate', type: 'DATETIME' },
                { name: 'squareFootage', type: 'REAL DEFAULT 0' },
                { name: 'roofPitch', type: 'TEXT DEFAULT ""' },
                { name: 'layers', type: 'INTEGER DEFAULT 0' },
                { name: 'shingleColor', type: 'TEXT DEFAULT ""' },
                { name: 'trades', type: 'TEXT DEFAULT "[]"' },
                { name: 'permitNumber', type: 'TEXT DEFAULT ""' },
                { name: 'gateCode', type: 'TEXT DEFAULT ""' },
                { name: 'lockboxCode', type: 'TEXT DEFAULT ""' },
                { name: 'dumpsterLocation', type: 'TEXT DEFAULT ""' },
                { name: 'specialInstructions', type: 'TEXT DEFAULT ""' },
                { name: 'workflowTags', type: 'TEXT DEFAULT "[]"' },
                { name: 'salesRepId', type: 'INTEGER REFERENCES contacts(id) ON DELETE SET NULL' },
                { name: 'projectManagerId', type: 'INTEGER REFERENCES contacts(id) ON DELETE SET NULL' },
                { name: 'crewName', type: 'TEXT DEFAULT ""' }
            ];
            for (const col of jobCols) {
                if (!tableHasColumn('jobs', col.name)) db.exec(`ALTER TABLE jobs ADD COLUMN ${col.name} ${col.type} `);
            }
            const commCols = [
                { name: 'tags', type: 'TEXT DEFAULT "[]"' },
                { name: 'attachments', type: 'TEXT DEFAULT "[]"' },
                { name: 'isPinned', type: 'INTEGER DEFAULT 0' },
            ];
            for (const col of commCols) {
                if (!tableHasColumn('communications', col.name)) db.exec(`ALTER TABLE communications ADD COLUMN ${col.name} ${col.type} `);
            }
            console.log('[migration 10] ✅ Schema successfully expanded');
        }
    },
    {
        version: 11,
        description: 'Phase 1: Multi-User Auth, Roles, and Entity Ownership',
        run: () => {
            console.log('[migration 11] Creating Auth and RBAC tables...');
            db.exec(`
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT NOT NULL UNIQUE,
                    passwordHash TEXT NOT NULL,
                    firstName TEXT NOT NULL,
                    lastName TEXT NOT NULL,
                    jobTitle TEXT DEFAULT '',
                    role TEXT DEFAULT 'user',
                    isActive INTEGER DEFAULT 1,
                    lastLoginAt DATETIME,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS sessions (
                    id TEXT PRIMARY KEY,
                    userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    expiresAt DATETIME NOT NULL,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS roles (
                    name TEXT PRIMARY KEY,
                    description TEXT DEFAULT ''
                );

                CREATE TABLE IF NOT EXISTS permissions (
                    name TEXT PRIMARY KEY,
                    description TEXT DEFAULT ''
                );

                CREATE TABLE IF NOT EXISTS role_permissions (
                    roleName TEXT REFERENCES roles(name) ON DELETE CASCADE,
                    permissionName TEXT REFERENCES permissions(name) ON DELETE CASCADE,
                    PRIMARY KEY (roleName, permissionName)
                );
            `);

            console.log('[migration 11] Adding ownership tracking columns to core entities...');
            const ownerCols = [
                { name: 'ownerId', type: 'INTEGER REFERENCES users(id) ON DELETE SET NULL' },
                { name: 'createdById', type: 'INTEGER REFERENCES users(id) ON DELETE SET NULL' },
                { name: 'updatedById', type: 'INTEGER REFERENCES users(id) ON DELETE SET NULL' }
            ];

            const entities = ['jobs', 'tasks', 'contacts', 'estimates'];
            for (const table of entities) {
                for (const col of ownerCols) {
                    if (!tableHasColumn(table, col.name)) {
                        db.exec(`ALTER TABLE ${table} ADD COLUMN ${col.name} ${col.type}`);
                    }
                }
            }

            console.log('[migration 11] ✅ Auth & Ownership schema successfully applied');
        }
    },
    {
        version: 12,
        description: 'Phase 2 & 3: Automation Engine, Audit Logs, and Communication Threads',
        run: () => {
            console.log('[migration 12] Creating Automation and Audit tables...');
            db.exec(`
                CREATE TABLE IF NOT EXISTS audit_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    entityType TEXT NOT NULL,
                    entityId INTEGER NOT NULL,
                    action TEXT NOT NULL,
                    actorId INTEGER REFERENCES users(id) ON DELETE SET NULL,
                    changes TEXT DEFAULT '{}',
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS automation_rules (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    description TEXT DEFAULT '',
                    triggerEvent TEXT NOT NULL,
                    conditions TEXT DEFAULT '[]',
                    actions TEXT DEFAULT '[]',
                    isActive INTEGER DEFAULT 1,
                    ownerId INTEGER REFERENCES users(id) ON DELETE SET NULL,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS automation_runs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ruleId INTEGER NOT NULL REFERENCES automation_rules(id) ON DELETE CASCADE,
                    triggerPayload TEXT DEFAULT '{}',
                    status TEXT DEFAULT 'pending',
                    error TEXT,
                    executedAt DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entityType, entityId);
                CREATE INDEX IF NOT EXISTS idx_automation_rules_trigger ON automation_rules(triggerEvent);
            `);

            console.log('[migration 12] Creating Communication Hub tables...');
            db.exec(`
                CREATE TABLE IF NOT EXISTS communication_threads (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    jobId INTEGER REFERENCES jobs(id) ON DELETE SET NULL,
                    contactId INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
                    status TEXT DEFAULT 'open',
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS message_attachments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    messageId INTEGER NOT NULL REFERENCES communications(id) ON DELETE CASCADE,
                    fileName TEXT NOT NULL,
                    filePath TEXT NOT NULL,
                    fileSize INTEGER DEFAULT 0,
                    contentType TEXT DEFAULT 'application/octet-stream',
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            `);

            if (!tableHasColumn('communications', 'threadId')) {
                db.exec('ALTER TABLE communications ADD COLUMN threadId INTEGER REFERENCES communication_threads(id) ON DELETE SET NULL');
            }

            console.log('[migration 12] ✅ Automation and Communications schema applied');
        }
    },
    {
        version: 13,
        description: 'Phase 4: Financial Workflow (Contracts, Invoices, Payments)',
        run: () => {
            console.log('[migration 13] Creating Financial Workflow tables...');
            db.exec(`
                CREATE TABLE IF NOT EXISTS contracts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    jobId INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
                    status TEXT DEFAULT 'draft', -- draft, sent, signed, void
                    totalAmount REAL DEFAULT 0,
                    signedAt DATETIME,
                    signedBy INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
                    pdfUrl TEXT,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS invoices (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    jobId INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
                    contractId INTEGER REFERENCES contracts(id) ON DELETE SET NULL,
                    status TEXT DEFAULT 'draft', -- draft, sent, partial, paid, overdue
                    amount REAL DEFAULT 0,
                    dueDate DATETIME,
                    sentAt DATETIME,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS payments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    invoiceId INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
                    amount REAL NOT NULL,
                    method TEXT DEFAULT 'credit_card', -- credit_card, ach, check, cash
                    status TEXT DEFAULT 'pending', -- pending, completed, failed, refunded
                    transactionId TEXT,
                    paymentDate DATETIME,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE INDEX IF NOT EXISTS idx_contracts_jobId ON contracts(jobId);
                CREATE INDEX IF NOT EXISTS idx_invoices_jobId ON invoices(jobId);
                CREATE INDEX IF NOT EXISTS idx_invoices_contractId ON invoices(contractId);
                CREATE INDEX IF NOT EXISTS idx_payments_invoiceId ON payments(invoiceId);
            `);

            // Add triggers for updatedAt
            const triggers = [
                `CREATE TRIGGER IF NOT EXISTS trg_contracts_updated AFTER UPDATE ON contracts
                 FOR EACH ROW BEGIN UPDATE contracts SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id; END`,
                `CREATE TRIGGER IF NOT EXISTS trg_invoices_updated AFTER UPDATE ON invoices
                 FOR EACH ROW BEGIN UPDATE invoices SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id; END`,
                `CREATE TRIGGER IF NOT EXISTS trg_payments_updated AFTER UPDATE ON payments
                 FOR EACH ROW BEGIN UPDATE payments SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id; END`,
            ];
            for (const sql of triggers) {
                try { db.exec(sql); } catch (e: any) { console.warn('[migration 13] Trigger warning:', e.message); }
            }

            console.log('[migration 13] ✅ Financial Workflow schema applied');
        }
    },
    {
        version: 14,
        description: 'Phase 5: Production & Crew Management',
        run: () => {
            console.log('[migration 14] Creating Production & Crew tables...');
            db.exec(`
                CREATE TABLE IF NOT EXISTS crews (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    leaderId INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
                    trade TEXT DEFAULT 'roofing',
                    color TEXT DEFAULT '#74B9FF',
                    isActive INTEGER DEFAULT 1,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS work_orders (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    jobId INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
                    crewId INTEGER REFERENCES crews(id) ON DELETE SET NULL,
                    status TEXT DEFAULT 'draft', -- draft, scheduled, in_progress, completed, canceled
                    scheduledDate DATETIME,
                    instructions TEXT DEFAULT '',
                    completedAt DATETIME,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS material_orders (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    jobId INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
                    supplierId INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
                    status TEXT DEFAULT 'draft', -- draft, ordered, delivered, partial
                    deliveryDate DATETIME,
                    materials TEXT DEFAULT '[]', -- JSON array of items
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS checklists (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    entityType TEXT NOT NULL, -- 'job', 'work_order'
                    entityId INTEGER NOT NULL,
                    name TEXT NOT NULL,
                    items TEXT DEFAULT '[]', -- JSON array: [{ id, text, isCompleted }]
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE INDEX IF NOT EXISTS idx_work_orders_jobId ON work_orders(jobId);
                CREATE INDEX IF NOT EXISTS idx_material_orders_jobId ON material_orders(jobId);
                CREATE INDEX IF NOT EXISTS idx_checklists_entity ON checklists(entityType, entityId);
            `);

            const triggers = [
                `CREATE TRIGGER IF NOT EXISTS trg_crews_updated AFTER UPDATE ON crews
                 FOR EACH ROW BEGIN UPDATE crews SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id; END`,
                `CREATE TRIGGER IF NOT EXISTS trg_work_orders_updated AFTER UPDATE ON work_orders
                 FOR EACH ROW BEGIN UPDATE work_orders SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id; END`,
                `CREATE TRIGGER IF NOT EXISTS trg_material_orders_updated AFTER UPDATE ON material_orders
                 FOR EACH ROW BEGIN UPDATE material_orders SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id; END`,
                `CREATE TRIGGER IF NOT EXISTS trg_checklists_updated AFTER UPDATE ON checklists
                 FOR EACH ROW BEGIN UPDATE checklists SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id; END`,
            ];
            for (const sql of triggers) {
                try { db.exec(sql); } catch (e: any) { console.warn('[migration 14] Trigger warning:', e.message); }
            }

            console.log('[migration 14] ✅ Production schema applied');
        }
    },
    {
        version: 15,
        description: 'Phase 7: Customer / Stakeholder Portal',
        run: () => {
            console.log('[migration 15] Creating Portal tables...');
            db.exec(`
                CREATE TABLE IF NOT EXISTS portal_users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    contactId INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
                    passwordHash TEXT,
                    hasAccess INTEGER DEFAULT 1,
                    lastLoginAt DATETIME,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(contactId)
                );

                CREATE TABLE IF NOT EXISTS portal_invites (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    contactId INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
                    jobId INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
                    token TEXT NOT NULL UNIQUE,
                    status TEXT DEFAULT 'pending', -- pending, accepted, expired
                    expiresAt DATETIME NOT NULL,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE INDEX IF NOT EXISTS idx_portal_users_contactId ON portal_users(contactId);
                CREATE INDEX IF NOT EXISTS idx_portal_invites_contactId ON portal_invites(contactId);
                CREATE INDEX IF NOT EXISTS idx_portal_invites_jobId ON portal_invites(jobId);
                CREATE INDEX IF NOT EXISTS idx_portal_invites_token ON portal_invites(token);
            `);

            const triggers = [
                `CREATE TRIGGER IF NOT EXISTS trg_portal_users_updated AFTER UPDATE ON portal_users
                 FOR EACH ROW BEGIN UPDATE portal_users SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id; END`,
                `CREATE TRIGGER IF NOT EXISTS trg_portal_invites_updated AFTER UPDATE ON portal_invites
                 FOR EACH ROW BEGIN UPDATE portal_invites SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id; END`,
            ];
            for (const sql of triggers) {
                try { db.exec(sql); } catch (e: any) { console.warn('[migration 15] Trigger warning:', e.message); }
            }

            console.log('[migration 15] ✅ Portal schema applied');
        }
    },
    {
        version: 16,
        description: 'Phase 9: Field / Mobile / Offline Execution',
        run: () => {
            console.log('[migration 16] Creating Mobile Sync Queue tables...');
            db.exec(`
                CREATE TABLE IF NOT EXISTS sync_queue (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    userId INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    entityType TEXT NOT NULL,
                    entityId INTEGER,          -- Null if it's a creation event waiting for a real ID
                    localId TEXT,              -- Client-side UUID for tracking creations
                    action TEXT NOT NULL,      -- create, update, delete
                    payload TEXT NOT NULL,     -- JSON string of the mutation
                    status TEXT DEFAULT 'pending', -- pending, processed, failed, conflict
                    errorMessage TEXT,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    processedAt DATETIME
                );

                CREATE INDEX IF NOT EXISTS idx_sync_queue_userId ON sync_queue(userId);
                CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
            `);
            console.log('[migration 16] ✅ Mobile Sync Queue schema applied');
        }
    },
    {
        version: 17,
        description: 'Hardening AccuLynx Sync: Adding Stable External IDs',
        run: () => {
            console.log('[migration 17] Adding AccuLynx foreign key columns...');

            if (!tableHasColumn('jobs', 'acculynxId')) {
                db.exec('ALTER TABLE jobs ADD COLUMN acculynxId TEXT');
                db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_acculynxId ON jobs(acculynxId)');
            }
            if (!tableHasColumn('contacts', 'acculynxId')) {
                db.exec('ALTER TABLE contacts ADD COLUMN acculynxId TEXT');
                db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_acculynxId ON contacts(acculynxId)');
            }
            if (!tableHasColumn('communications', 'sourceExternalId')) {
                db.exec('ALTER TABLE communications ADD COLUMN sourceExternalId TEXT');
                db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_comms_sourceExtId ON communications(sourceExternalId)');
            }
            if (!tableHasColumn('communications', 'mediaMetadata')) {
                db.exec('ALTER TABLE communications ADD COLUMN mediaMetadata TEXT DEFAULT "{}"');
            }

            console.log('[migration 17] ✅ AccuLynx integration stable IDs applied');
        }
    },
    {
        version: 18,
        description: 'Phase 9: Checkpointing & Deduplicated Media Queue',
        run: () => {
            console.log('[migration 18] Creating media_queue table...');
            db.exec(`
                CREATE TABLE IF NOT EXISTS media_queue (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    jobId INTEGER REFERENCES jobs(id) ON DELETE SET NULL,
                    sourceExternalId TEXT NOT NULL UNIQUE,
                    url TEXT NOT NULL,
                    fileName TEXT,
                    status TEXT DEFAULT 'pending', -- pending, downloading, completed, failed
                    attempts INTEGER DEFAULT 0,
                    localFilePath TEXT,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                
                CREATE INDEX IF NOT EXISTS idx_media_queue_status ON media_queue(status);
                CREATE INDEX IF NOT EXISTS idx_media_queue_jobId ON media_queue(jobId);
             `);
            console.log('[migration 18] ✅ Media Queue schema applied');
        }
    },
    {
        version: 19,
        description: 'Phase 11: AccuLynx Storage Model Redesign & ClaimSync Courier Schema',
        run: () => {
            console.log('[migration 19] Adding rawPayload storage columns and creating new integration tables...');

            if (!tableHasColumn('jobs', 'rawPayload')) {
                db.exec('ALTER TABLE jobs ADD COLUMN rawPayload TEXT DEFAULT "{}"');
            }
            if (!tableHasColumn('jobs', 'financialSummary')) {
                db.exec('ALTER TABLE jobs ADD COLUMN financialSummary TEXT DEFAULT "{}"');
            }
            if (!tableHasColumn('contacts', 'rawPayload')) {
                db.exec('ALTER TABLE contacts ADD COLUMN rawPayload TEXT DEFAULT "{}"');
            }

            db.exec(`
                CREATE TABLE IF NOT EXISTS claimsync_outbox (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    jobId INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
                    packageType TEXT NOT NULL,
                    payload TEXT NOT NULL,
                    status TEXT DEFAULT 'staged',
                    approvedBy INTEGER REFERENCES users(id) ON DELETE SET NULL,
                    externalReferenceId TEXT,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                CREATE INDEX IF NOT EXISTS idx_claimsync_outbox_job ON claimsync_outbox(jobId);
                CREATE INDEX IF NOT EXISTS idx_claimsync_outbox_status ON claimsync_outbox(status);

                CREATE TABLE IF NOT EXISTS integration_endpoints (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    provider TEXT NOT NULL,
                    category TEXT NOT NULL,
                    method TEXT NOT NULL,
                    pathTemplate TEXT NOT NULL,
                    queryShape TEXT DEFAULT '{}',
                    isReadWrite TEXT DEFAULT 'read',
                    riskLevel INTEGER DEFAULT 1,
                    authMode TEXT DEFAULT 'session',
                    payloadSchema TEXT DEFAULT '{}',
                    responseSchema TEXT DEFAULT '{}',
                    notes TEXT DEFAULT '',
                    isEnabled INTEGER DEFAULT 1
                );
            `);
            console.log('[migration 19] ✅ AccuLynx Storage Model Redesign complete');
        }
    },
    {
        version: 20,
        description: 'Phase 12: Universal tracking, media separation, typed courier, and action registry',
        run: () => {
            console.log('[migration 20] Normalizing source tracking fields across entities...');

            const sourceCols = [
                { name: 'sourceSystem', type: 'TEXT DEFAULT "local"' },
                { name: 'sourceEntityType', type: 'TEXT' },
                { name: 'sourceModifiedAt', type: 'DATETIME' },
                { name: 'sourceHash', type: 'TEXT' }
            ];

            const entities = ['jobs', 'contacts', 'communications', 'tasks'];
            for (const table of entities) {
                for (const col of sourceCols) {
                    if (!tableHasColumn(table, col.name)) {
                        db.exec(`ALTER TABLE ${table} ADD COLUMN ${col.name} ${col.type}`);
                    }
                }
                // Ensure rawPayload exists on tables that missed V19
                if (table === 'communications' || table === 'tasks') {
                    if (!tableHasColumn(table, 'rawPayload')) {
                        db.exec(`ALTER TABLE ${table} ADD COLUMN rawPayload TEXT DEFAULT "{}"`);
                    }
                }
            }

            console.log('[migration 20] Decoupling media metadata from queue...');
            db.exec(`
                CREATE TABLE IF NOT EXISTS media_metadata (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    jobId INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
                    sourceExternalId TEXT NOT NULL UNIQUE,
                    url TEXT NOT NULL,
                    fileName TEXT,
                    fileSize INTEGER,
                    mimeType TEXT,
                    rawPayload TEXT DEFAULT '{}',
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                CREATE INDEX IF NOT EXISTS idx_media_meta_jobId ON media_metadata(jobId);
                CREATE INDEX IF NOT EXISTS idx_media_meta_url ON media_metadata(url);
            `);

            console.log('[migration 20] Expanding claimsync_outbox to Typed Courier model...');
            db.exec(`DROP TABLE IF EXISTS claimsync_outbox`); // Safe, it was just created empty in V19
            db.exec(`
                CREATE TABLE claimsync_outbox (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    jobId INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
                    packageType TEXT NOT NULL,
                    packageVersion INTEGER DEFAULT 1,
                    payload TEXT NOT NULL,
                    courierStatus TEXT DEFAULT 'staged',
                    retryCount INTEGER DEFAULT 0,
                    errorMessage TEXT,
                    approvedBy INTEGER REFERENCES users(id) ON DELETE SET NULL,
                    approvedAt DATETIME,
                    deliveredAt DATETIME,
                    externalReferenceId TEXT,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                CREATE INDEX idx_claimsync_outbox_job ON claimsync_outbox(jobId);
                CREATE INDEX idx_claimsync_outbox_status ON claimsync_outbox(courierStatus);
            `);

            console.log('[migration 20] Creating integration_actions registry...');
            db.exec(`
                CREATE TABLE IF NOT EXISTS integration_actions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    actionKey TEXT NOT NULL UNIQUE,
                    provider TEXT NOT NULL,
                    endpointId INTEGER REFERENCES integration_endpoints(id) ON DELETE SET NULL,
                    type TEXT NOT NULL, -- 'read', 'write', 'courier'
                    riskLevel INTEGER DEFAULT 1,
                    requiresApproval INTEGER DEFAULT 0,
                    expectedPayloadSchema TEXT DEFAULT '{}',
                    expectedResponseSchema TEXT DEFAULT '{}',
                    isEnabled INTEGER DEFAULT 1,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            `);

            console.log('[migration 20] ✅ Phase 12 schema applied');
        }
    }
];
export function runMigrations() {
    const currentVersion = getCurrentVersion();
    const pending = migrations.filter(m => m.version > currentVersion);

    if (pending.length > 0) {
        console.log(`[db] Running ${pending.length} migration(s) from v${currentVersion}...`);
        const runAll = db.transaction(() => {
            for (const m of pending) {
                console.log(`[db] Migration ${m.version}: ${m.description} `);
                try {
                    m.run();
                    markVersion(m.version, m.description);
                } catch (err: any) {
                    console.error(`[db] ❌ Migration ${m.version} failed: `, err.message);
                    throw err;
                }
            }
        });

        try {
            runAll();
            console.log(`[db] ✅ All migrations applied.Now at v${migrations[migrations.length - 1].version} `);
        } catch (err: any) {
            console.error('[db] ❌ Migration failed, rolled back:', err.message);
        }
    } else {
        console.log(`[db] Schema up to date(v${currentVersion})`);
    }
}

export function generateJobNumber(): string {
    const year = new Date().getFullYear();
    const count = (db.prepare('SELECT COUNT(*) as c FROM jobs WHERE jobNumber LIKE ?').get(`JOB - ${year} -% `) as any)?.c || 0;
    return `JOB - ${year} -${String(count + 1).padStart(3, '0')} `;
}


