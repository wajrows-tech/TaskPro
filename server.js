// server.ts
import express from "express";
import path2 from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

// src/db.ts
import Database from "better-sqlite3";
import path from "path";
import os from "os";
import { mkdirSync } from "fs";
var dataDir = process.env.APPDATA ? path.join(process.env.APPDATA, "TaskPro") : path.join(os.homedir(), ".taskpro");
mkdirSync(dataDir, { recursive: true });
var dbPath = path.join(dataDir, "taskpro.db");
var db = new Database(dbPath);
db.exec(`
  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    personality TEXT,
    promises TEXT,
    deliverables TEXT,
    urgency TEXT DEFAULT 'medium', -- low, medium, high
    strategyDoc TEXT DEFAULT '',
    contextDump TEXT DEFAULT '',
    processEvaluation TEXT DEFAULT '[]',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS task_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'medium',
    action TEXT DEFAULT 'other',
    subtasks TEXT DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS communications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    clientId INTEGER NOT NULL,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'email', -- email, call, meeting, note
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (clientId) REFERENCES clients(id)
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    clientId INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'todo', -- todo, in_progress, done
    priority TEXT DEFAULT 'medium', -- low, medium, high
    action TEXT DEFAULT 'other', -- inspect, invoice, email, consult, call, other
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (clientId) REFERENCES clients(id)
  );

  CREATE TABLE IF NOT EXISTS subtasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    taskId INTEGER NOT NULL,
    title TEXT NOT NULL,
    isCompleted INTEGER DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (taskId) REFERENCES tasks(id)
  );

  CREATE TABLE IF NOT EXISTS task_dependencies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    taskId INTEGER NOT NULL,
    dependsOnTaskId INTEGER NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (dependsOnTaskId) REFERENCES tasks(id) ON DELETE CASCADE,
    UNIQUE(taskId, dependsOnTaskId)
  );

  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    clientId INTEGER,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'general', -- general, history, development, antigravity_prep
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (clientId) REFERENCES clients(id)
  );
`);
var addColumnSafely = (table, column, definition) => {
  try {
    const tableInfo = db.prepare(`PRAGMA table_info(${table})`).all();
    const columnNames = tableInfo.map((c) => c.name);
    if (!columnNames.includes(column)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
  } catch (err) {
    if (!err.message.includes("duplicate column name")) {
      console.error(`Migration error on ${table}.${column}:`, err.message);
    }
  }
};
addColumnSafely("notes", "clientId", "INTEGER REFERENCES clients(id)");
addColumnSafely("tasks", "clientId", "INTEGER REFERENCES clients(id)");
addColumnSafely("tasks", "action", "TEXT DEFAULT 'other'");
addColumnSafely("tasks", "scheduledDate", "TEXT DEFAULT ''");
addColumnSafely("tasks", "startTime", "TEXT DEFAULT ''");
addColumnSafely("tasks", "duration", "INTEGER DEFAULT 60");
addColumnSafely("tasks", "waitingOn", "TEXT DEFAULT ''");
addColumnSafely("tasks", "icon", "TEXT DEFAULT ''");
addColumnSafely("task_templates", "subtasks", "TEXT DEFAULT '[]'");
addColumnSafely("clients", "urgency", "TEXT DEFAULT 'medium'");
addColumnSafely("clients", "strategyDoc", "TEXT DEFAULT ''");
addColumnSafely("clients", "contextDump", "TEXT DEFAULT ''");
addColumnSafely("clients", "processEvaluation", "TEXT DEFAULT '[]'");
addColumnSafely("clients", "stage", "TEXT DEFAULT 'inspection'");
addColumnSafely("clients", "estimatedValue", "REAL DEFAULT 0");
addColumnSafely("clients", "adjusterRead", "TEXT DEFAULT ''");
addColumnSafely("clients", "clientRead", "TEXT DEFAULT ''");
addColumnSafely("clients", "email", "TEXT DEFAULT ''");
addColumnSafely("clients", "phone", "TEXT DEFAULT ''");
addColumnSafely("clients", "address", "TEXT DEFAULT ''");
addColumnSafely("tasks", "isFrog", "INTEGER DEFAULT 0");
addColumnSafely("tasks", "frogName", "TEXT DEFAULT ''");
db.exec(`
  CREATE TABLE IF NOT EXISTS frog_hall_of_fame (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    taskId INTEGER NOT NULL,
    taskTitle TEXT NOT NULL,
    frogName TEXT NOT NULL,
    clientName TEXT DEFAULT '',
    completedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);
db.exec(`
  CREATE TABLE IF NOT EXISTS ai_conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL,          -- 'user' | 'assistant'
    content TEXT NOT NULL,
    functionCalls TEXT DEFAULT '[]',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// server.ts
import os2 from "os";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path2.dirname(__filename);
async function startServer() {
  const app = express();
  const PORT = 3005;
  const logDir = path2.join(os2.tmpdir(), "TaskPro_Debug");
  const logFile = path2.join(logDir, "server.log");
  if (!fs.existsSync(logDir)) {
    try {
      fs.mkdirSync(logDir, { recursive: true });
    } catch (e) {
      console.error("Failed to create log dir:", e.message);
    }
  }
  const log = (...args) => {
    const msg = `[${(/* @__PURE__ */ new Date()).toISOString()}] ${args.join(" ")}
`;
    try {
      fs.appendFileSync(logFile, msg);
    } catch (e) {
      console.error("Failed to write server log:", e.message);
    }
    console.log(...args);
  };
  log("--- Server starting ---");
  log("NODE_ENV:", process.env.NODE_ENV);
  log("__dirname:", __dirname);
  app.use(express.json());
  app.use("/api", (req, res, next) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Content-Type", "application/json");
    next();
  });
  app.get("/api/clients", (req, res) => {
    const clients = db.prepare("SELECT * FROM clients ORDER BY name ASC").all();
    res.json(clients);
  });
  app.post("/api/clients", (req, res) => {
    const { name, personality, promises, deliverables, urgency, strategyDoc, contextDump, stage, estimatedValue, adjusterRead, clientRead, email, phone, address } = req.body;
    const stmt = db.prepare("INSERT INTO clients (name, personality, promises, deliverables, urgency, strategyDoc, contextDump, stage, estimatedValue, adjusterRead, clientRead, email, phone, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    const info = stmt.run(
      name,
      personality || "",
      promises || "",
      deliverables || "",
      urgency || "medium",
      strategyDoc || "",
      contextDump || "",
      stage || "inspection",
      estimatedValue || 0,
      adjusterRead || "",
      clientRead || "",
      email || "",
      phone || "",
      address || ""
    );
    const client = db.prepare("SELECT * FROM clients WHERE id = ?").get(info.lastInsertRowid);
    res.json(client);
  });
  app.put("/api/clients/:id", (req, res) => {
    const { id } = req.params;
    const existing = db.prepare("SELECT * FROM clients WHERE id = ?").get(id);
    if (!existing) return res.status(404).json({ error: "Client not found" });
    const {
      name = existing.name,
      personality = existing.personality,
      promises = existing.promises,
      deliverables = existing.deliverables,
      urgency = existing.urgency,
      strategyDoc = existing.strategyDoc,
      contextDump = existing.contextDump,
      stage = existing.stage,
      estimatedValue = existing.estimatedValue,
      adjusterRead = existing.adjusterRead,
      clientRead = existing.clientRead,
      processEvaluation = existing.processEvaluation,
      email = existing.email || "",
      phone = existing.phone || "",
      address = existing.address || ""
    } = req.body;
    const stmt = db.prepare("UPDATE clients SET name = ?, personality = ?, promises = ?, deliverables = ?, urgency = ?, strategyDoc = ?, contextDump = ?, stage = ?, estimatedValue = ?, adjusterRead = ?, clientRead = ?, processEvaluation = ?, email = ?, phone = ?, address = ? WHERE id = ?");
    stmt.run(name, personality, promises, deliverables, urgency, strategyDoc, contextDump, stage, estimatedValue, adjusterRead, clientRead, processEvaluation, email, phone, address, id);
    const client = db.prepare("SELECT * FROM clients WHERE id = ?").get(id);
    res.json(client);
  });
  app.delete("/api/clients/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM communications WHERE clientId = ?").run(id);
    db.prepare("UPDATE tasks SET clientId = NULL WHERE clientId = ?").run(id);
    db.prepare("DELETE FROM clients WHERE id = ?").run(id);
    res.json({ success: true });
  });
  app.get("/api/clients/:id/communications", (req, res) => {
    const comms = db.prepare("SELECT * FROM communications WHERE clientId = ? ORDER BY createdAt DESC").all(req.params.id);
    res.json(comms);
  });
  app.post("/api/clients/:id/communications", (req, res) => {
    const { content, type } = req.body;
    const stmt = db.prepare("INSERT INTO communications (clientId, content, type) VALUES (?, ?, ?)");
    const info = stmt.run(req.params.id, content, type || "email");
    const comm = db.prepare("SELECT * FROM communications WHERE id = ?").get(info.lastInsertRowid);
    res.json(comm);
  });
  app.get("/api/tasks", (req, res) => {
    const tasks = db.prepare(`
      SELECT tasks.*, clients.name as clientName 
      FROM tasks 
      LEFT JOIN clients ON tasks.clientId = clients.id 
      ORDER BY tasks.createdAt DESC
    `).all();
    const deps = db.prepare("SELECT taskId, dependsOnTaskId FROM task_dependencies").all();
    const depMap = {};
    for (const d of deps) {
      if (!depMap[d.taskId]) depMap[d.taskId] = [];
      depMap[d.taskId].push(d.dependsOnTaskId);
    }
    const enriched = tasks.map((t) => ({ ...t, dependsOn: depMap[t.id] || [] }));
    res.json(enriched);
  });
  app.post("/api/tasks", (req, res) => {
    const { title, description, status, priority, clientId, action, scheduledDate, startTime, duration, waitingOn, icon, isFrog, frogName } = req.body;
    const stmt = db.prepare("INSERT INTO tasks (title, description, status, priority, clientId, action, scheduledDate, startTime, duration, waitingOn, icon, isFrog, frogName) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    const info = stmt.run(title, description || "", status || "todo", priority || "medium", clientId || null, action || "other", scheduledDate || "", startTime || "", duration || 60, waitingOn || "", icon || "", isFrog ? 1 : 0, frogName || "");
    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(info.lastInsertRowid);
    res.json(task);
  });
  app.put("/api/tasks/:id", (req, res) => {
    const { id } = req.params;
    const existing = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
    if (!existing) return res.status(404).json({ error: "Task not found" });
    const {
      title = existing.title,
      description = existing.description,
      status = existing.status,
      priority = existing.priority,
      action = existing.action,
      clientId = existing.clientId,
      scheduledDate = existing.scheduledDate,
      startTime = existing.startTime,
      duration = existing.duration,
      waitingOn = existing.waitingOn,
      icon = existing.icon,
      isFrog = existing.isFrog,
      frogName = existing.frogName
    } = req.body;
    const changes = [];
    if (status !== existing.status) changes.push(`status from '${existing.status}' to '${status}'`);
    if (priority !== existing.priority) changes.push(`priority from '${existing.priority}' to '${priority}'`);
    if (action !== existing.action) changes.push(`action from '${existing.action}' to '${action}'`);
    if (clientId !== existing.clientId) {
      const oldClient = existing.clientId ? db.prepare("SELECT name FROM clients WHERE id = ?").get(existing.clientId) : null;
      const newClient = clientId ? db.prepare("SELECT name FROM clients WHERE id = ?").get(clientId) : null;
      changes.push(`client from '${oldClient?.name || "None"}' to '${newClient?.name || "None"}'`);
    }
    if (changes.length > 0) {
      const noteContent = `Task '${title}' updated: ${changes.join(", ")}`;
      db.prepare("INSERT INTO notes (content, type) VALUES (?, ?)").run(noteContent, "history");
    }
    const stmt = db.prepare("UPDATE tasks SET title = ?, description = ?, status = ?, priority = ?, action = ?, clientId = ?, scheduledDate = ?, startTime = ?, duration = ?, waitingOn = ?, icon = ?, isFrog = ?, frogName = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?");
    stmt.run(title, description, status, priority, action, clientId, scheduledDate, startTime, duration, waitingOn, icon, isFrog ? 1 : 0, frogName || "", id);
    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
    res.json(task);
  });
  app.get("/api/tasks/:id/subtasks", (req, res) => {
    const subtasks = db.prepare("SELECT * FROM subtasks WHERE taskId = ?").all(req.params.id);
    res.json(subtasks);
  });
  app.post("/api/tasks/:id/subtasks", (req, res) => {
    const { title } = req.body;
    const stmt = db.prepare("INSERT INTO subtasks (taskId, title) VALUES (?, ?)");
    const info = stmt.run(req.params.id, title);
    const subtask = db.prepare("SELECT * FROM subtasks WHERE id = ?").get(info.lastInsertRowid);
    res.json(subtask);
  });
  app.put("/api/subtasks/:id", (req, res) => {
    const { isCompleted } = req.body;
    db.prepare("UPDATE subtasks SET isCompleted = ? WHERE id = ?").run(isCompleted ? 1 : 0, req.params.id);
    res.json({ success: true });
  });
  app.delete("/api/tasks/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM task_dependencies WHERE taskId = ? OR dependsOnTaskId = ?").run(id, id);
    db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
    res.json({ success: true });
  });
  app.get("/api/dependencies", (req, res) => {
    const rows = db.prepare("SELECT taskId, dependsOnTaskId FROM task_dependencies").all();
    res.json(rows);
  });
  app.get("/api/tasks/:id/dependencies", (req, res) => {
    const rows = db.prepare("SELECT dependsOnTaskId FROM task_dependencies WHERE taskId = ?").all(req.params.id);
    res.json(rows);
  });
  app.post("/api/tasks/:id/dependencies", (req, res) => {
    const { dependsOnTaskId } = req.body;
    if (!dependsOnTaskId) return res.status(400).json({ error: "dependsOnTaskId required" });
    if (Number(req.params.id) === Number(dependsOnTaskId)) {
      return res.status(400).json({ error: "Task cannot depend on itself" });
    }
    try {
      db.prepare("INSERT OR IGNORE INTO task_dependencies (taskId, dependsOnTaskId) VALUES (?, ?)").run(req.params.id, dependsOnTaskId);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.delete("/api/tasks/:id/dependencies/:depId", (req, res) => {
    db.prepare("DELETE FROM task_dependencies WHERE taskId = ? AND dependsOnTaskId = ?").run(req.params.id, req.params.depId);
    res.json({ success: true });
  });
  app.get("/api/notes", (req, res) => {
    const notes = db.prepare("SELECT * FROM notes ORDER BY createdAt DESC").all();
    res.json(notes);
  });
  app.post("/api/notes", (req, res) => {
    const { content, type, clientId } = req.body;
    const stmt = db.prepare("INSERT INTO notes (content, type, clientId) VALUES (?, ?, ?)");
    const info = stmt.run(content, type || "general", clientId || null);
    const note = db.prepare("SELECT * FROM notes WHERE id = ?").get(info.lastInsertRowid);
    res.json(note);
  });
  app.put("/api/notes/:id", (req, res) => {
    const { id } = req.params;
    const { content, type, clientId } = req.body;
    const stmt = db.prepare("UPDATE notes SET content = ?, type = ?, clientId = ? WHERE id = ?");
    stmt.run(content, type, clientId, id);
    const note = db.prepare("SELECT * FROM notes WHERE id = ?").get(id);
    res.json(note);
  });
  app.get("/api/task-templates", (req, res) => {
    const templates = db.prepare("SELECT * FROM task_templates").all();
    res.json(templates);
  });
  app.post("/api/task-templates", (req, res) => {
    const { title, description, priority, action, subtasks } = req.body;
    const stmt = db.prepare("INSERT INTO task_templates (title, description, priority, action, subtasks) VALUES (?, ?, ?, ?, ?)");
    const info = stmt.run(title, description || "", priority || "medium", action || "other", JSON.stringify(subtasks || []));
    const template = db.prepare("SELECT * FROM task_templates WHERE id = ?").get(info.lastInsertRowid);
    res.json(template);
  });
  app.delete("/api/task-templates/:id", (req, res) => {
    db.prepare("DELETE FROM task_templates WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });
  app.get("/api/frog-hall-of-fame", (req, res) => {
    const rows = db.prepare("SELECT * FROM frog_hall_of_fame ORDER BY completedAt DESC").all();
    res.json(rows);
  });
  app.post("/api/frog-hall-of-fame", (req, res) => {
    const { taskId, taskTitle, frogName, clientName } = req.body;
    const stmt = db.prepare("INSERT INTO frog_hall_of_fame (taskId, taskTitle, frogName, clientName) VALUES (?, ?, ?, ?)");
    const info = stmt.run(taskId, taskTitle, frogName || "The Unnamed Frog", clientName || "");
    const row = db.prepare("SELECT * FROM frog_hall_of_fame WHERE id = ?").get(info.lastInsertRowid);
    res.json(row);
  });
  app.get("/api/ai-conversations", (req, res) => {
    const limit = parseInt(req.query.limit) || 200;
    const rows = db.prepare("SELECT * FROM ai_conversations ORDER BY createdAt ASC LIMIT ?").all(limit);
    res.json(rows);
  });
  app.post("/api/ai-conversations", (req, res) => {
    const { role, content, functionCalls } = req.body;
    const stmt = db.prepare("INSERT INTO ai_conversations (role, content, functionCalls) VALUES (?, ?, ?)");
    const info = stmt.run(role, content, JSON.stringify(functionCalls || []));
    const row = db.prepare("SELECT * FROM ai_conversations WHERE id = ?").get(info.lastInsertRowid);
    res.json(row);
  });
  app.delete("/api/ai-conversations", (req, res) => {
    db.prepare("DELETE FROM ai_conversations").run();
    res.json({ success: true });
  });
  app.post("/api/ai-query", (req, res) => {
    try {
      const { sql } = req.body;
      if (!sql || typeof sql !== "string") {
        return res.status(400).json({ error: "SQL query required" });
      }
      const trimmed = sql.trim().toUpperCase();
      if (!trimmed.startsWith("SELECT") && !trimmed.startsWith("PRAGMA")) {
        return res.status(403).json({ error: "Only SELECT and PRAGMA queries are allowed" });
      }
      const rows = db.prepare(sql).all();
      res.json({ rows, count: rows.length });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });
  app.post("/api/ai-bulk", (req, res) => {
    try {
      const { operations } = req.body;
      const results = [];
      const txn = db.transaction(() => {
        for (const op of operations) {
          if (op.type === "updateTask") {
            const existing = db.prepare("SELECT * FROM tasks WHERE id = ?").get(op.id);
            if (!existing) {
              results.push({ error: `Task ${op.id} not found` });
              continue;
            }
            const fields = { ...existing, ...op.fields };
            db.prepare("UPDATE tasks SET title = ?, description = ?, status = ?, priority = ?, action = ?, clientId = ?, scheduledDate = ?, startTime = ?, duration = ?, waitingOn = ?, icon = ?, isFrog = ?, frogName = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?").run(fields.title, fields.description, fields.status, fields.priority, fields.action, fields.clientId, fields.scheduledDate, fields.startTime, fields.duration, fields.waitingOn, fields.icon, fields.isFrog ? 1 : 0, fields.frogName || "", op.id);
            results.push({ success: true, id: op.id, type: "updateTask" });
          } else if (op.type === "updateClient") {
            const existing = db.prepare("SELECT * FROM clients WHERE id = ?").get(op.id);
            if (!existing) {
              results.push({ error: `Client ${op.id} not found` });
              continue;
            }
            const fields = { ...existing, ...op.fields };
            db.prepare("UPDATE clients SET name = ?, personality = ?, promises = ?, deliverables = ?, urgency = ?, strategyDoc = ?, contextDump = ?, stage = ?, estimatedValue = ?, adjusterRead = ?, clientRead = ?, processEvaluation = ?, email = ?, phone = ?, address = ? WHERE id = ?").run(fields.name, fields.personality, fields.promises, fields.deliverables, fields.urgency, fields.strategyDoc, fields.contextDump, fields.stage, fields.estimatedValue, fields.adjusterRead, fields.clientRead, fields.processEvaluation, fields.email, fields.phone, fields.address, op.id);
            results.push({ success: true, id: op.id, type: "updateClient" });
          } else if (op.type === "deleteTask") {
            db.prepare("DELETE FROM task_dependencies WHERE taskId = ? OR dependsOnTaskId = ?").run(op.id, op.id);
            db.prepare("DELETE FROM tasks WHERE id = ?").run(op.id);
            results.push({ success: true, id: op.id, type: "deleteTask" });
          } else if (op.type === "deleteClient") {
            db.prepare("DELETE FROM communications WHERE clientId = ?").run(op.id);
            db.prepare("UPDATE tasks SET clientId = NULL WHERE clientId = ?").run(op.id);
            db.prepare("DELETE FROM clients WHERE id = ?").run(op.id);
            results.push({ success: true, id: op.id, type: "deleteClient" });
          } else if (op.type === "reassignTasks") {
            db.prepare("UPDATE tasks SET clientId = ? WHERE clientId = ?").run(op.toClientId, op.fromClientId);
            results.push({ success: true, type: "reassignTasks", from: op.fromClientId, to: op.toClientId });
          } else if (op.type === "mergeClients") {
            db.prepare("UPDATE tasks SET clientId = ? WHERE clientId = ?").run(op.targetId, op.sourceId);
            db.prepare("UPDATE communications SET clientId = ? WHERE clientId = ?").run(op.targetId, op.sourceId);
            db.prepare("UPDATE notes SET clientId = ? WHERE clientId = ?").run(op.targetId, op.sourceId);
            db.prepare("DELETE FROM clients WHERE id = ?").run(op.sourceId);
            results.push({ success: true, type: "mergeClients", sourceId: op.sourceId, targetId: op.targetId });
          }
        }
      });
      txn();
      db.prepare("INSERT INTO notes (content, type) VALUES (?, ?)").run(
        `AI BULK: ${operations.length} operations executed: ${results.filter((r) => r.success).length} succeeded`,
        "history"
      );
      res.json({ results });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  const ENV = (process.env.NODE_ENV || "development").trim().toLowerCase();
  log("ENV check:", ENV);
  if (ENV !== "production") {
    log("[server] Starting Vite in dev mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path2.resolve(__dirname, "dist");
    const indexHtml = path2.join(distPath, "index.html");
    log("[server] Production mode detected");
    log("[server] __dirname:", __dirname);
    log("[server] distPath:", distPath);
    log("[server] index.html exists:", fs.existsSync(indexHtml));
    app.use(express.static(distPath));
    app.get("/health", (req, res) => res.json({ status: "ok", __dirname, distPath }));
    app.get("*", (req, res) => {
      if (req.path.startsWith("/api")) return res.status(404).json({ error: "API not found" });
      const ext = path2.extname(req.path);
      if (ext && ext !== ".html") {
        log(`[server] 404 for asset: ${req.path}`);
        return res.status(404).send("Not found");
      }
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        log(`[server] ERROR: index.html not found at ${indexHtml}`);
        res.status(404).send("TaskPro Build Error: dist/index.html not found. Path: " + indexHtml);
      }
    });
  }
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
  server.on("error", (e) => {
    if (e.code === "EADDRINUSE") {
      console.error(`Port ${PORT} is already in use. A previous instance might still be running. Process will exit.`);
      process.exit(1);
    } else {
      console.error("Server error:", e);
      process.exit(1);
    }
  });
}
startServer();
