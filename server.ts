import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

import { bootstrapDatabase } from './src/db/index.ts';
import { bootstrapAgents, AGENT_MANIFESTS } from './src/agents/index.ts';
import { registry } from './src/integrations/registry.ts';
import { INTEGRATION_MODULES } from './src/integrations/modules/index.ts';
import { AutomationService } from './src/services/AutomationService.ts';

// Import the unified API router
import { apiRouter } from './src/api/index.ts';

// Bootstrap the database immediately so schema exists before server starts
bootstrapDatabase();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Load .env file ──────────────────────────────────────────────────────────
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
  console.log('[env] Loaded .env file');
}

async function startServer() {
  const app = express();
  const PORT = 3005;

  const logDir = path.join(os.tmpdir(), 'TaskPro_Debug');
  const logFile = path.join(logDir, 'server.log');
  if (!fs.existsSync(logDir)) {
    try { fs.mkdirSync(logDir, { recursive: true }); } catch (e: any) { console.error('Failed to create log dir:', e.message); }
  }

  const log = (...args: any[]) => {
    const msg = `[${new Date().toISOString()}] ${args.join(' ')}\n`;
    try { fs.appendFileSync(logFile, msg); } catch (e: any) { console.error('Failed to write server log:', e.message); }
    console.log(...args);
  };

  log('--- CRM Server starting ---');
  app.use(express.json());

  // ── Bootstrap Agentic Platform ──────────────────────────────────────────
  try {
    bootstrapAgents();
    log('[agents] ✅ Agentic platform online — 7 agents across 3 pillars');
    AutomationService.init();
    log('[automation] ✅ Automation Engine online');
  } catch (err: any) {
    log('[agents] ⚠️ Agent bootstrap warning:', err.message);
  }

  // ── Bootstrap Integrations ──────────────────────────────────────────────
  try {
    INTEGRATION_MODULES.forEach(mod => registry.register(mod));
    log(`[integrations] ✅ Integration Registry online — loaded ${INTEGRATION_MODULES.length} modules`);
  } catch (err: any) {
    log('[integrations] ⚠️ Integration registry warning:', err.message);
  }

  // ── Serve Documents ───────────────────────────────────────────────────────
  const docsDir = path.join(__dirname, 'documents');
  if (!fs.existsSync(docsDir)) {
    try { fs.mkdirSync(docsDir, { recursive: true }); } catch (e: any) { log('Failed to create docs dir', e.message); }
  }
  app.use('/documents', express.static(docsDir));

  // Mount the API Router
  app.use('/api', apiRouter);

  // ══════════════════════════════════════════════════════════════════════════
  // DEV / PROD SERVER SETUP
  // ══════════════════════════════════════════════════════════════════════════
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    log('[server] Vite dev middleware attached');
  } else {
    const distPath = path.join(__dirname, 'dist');
    const indexHtml = path.join(distPath, 'index.html');
    app.use(express.static(distPath));
    app.get('/health', (req, res) => res.json({ status: 'ok' }));
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api')) return res.status(404).json({ error: 'API not found' });
      const ext = path.extname(req.path);
      if (ext && ext !== '.html') return res.status(404).send('Not found');
      if (fs.existsSync(indexHtml)) { res.sendFile(indexHtml); }
      else { res.status(404).send('Build Error: dist/index.html not found'); }
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`TaskPro Server running on http://localhost:${PORT}`);
  });

  server.on('error', (e: any) => {
    if (e.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use.`);
      process.exit(1);
    } else {
      console.error('Server error:', e);
      process.exit(1);
    }
  });
}

startServer();
