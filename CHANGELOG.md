# Changelog

All notable changes to **TaskPro** will be documented in this file.

This project follows [Semantic Versioning](https://semver.org/):
- **MAJOR** (x.0.0) — breaking changes
- **MINOR** (0.x.0) — new features, backwards-compatible
- **PATCH** (0.0.x) — bug fixes, backwards-compatible

---

## [1.0.1] — 2026-03-07

### Added
- Agentic CRM platform with multi-agent orchestration (7 sub-agents)
- Job management with Kanban board and pipeline visualization
- Contact management with linking to jobs
- Communication system with threaded inbox and email bridge (SMTP/IMAP)
- Document management with upload and organization
- Estimate builder for scope-of-work items
- Finance tab with invoicing and payment tracking
- Production scheduling and crew management
- AI-powered chat panel with Gemini integration
- Agent approvals panel for autonomous task execution
- Smart command bar for quick actions
- Calendar and scheduling integration
- Dashboard with revenue forecasting, client pulse, and gamified health
- Focus timer and day planner widgets
- Platform identity hardening with guardrails
- Integration modules: AccuLynx, CompanyCam, Gmail, Google Calendar, QuickBooks, Twilio
- Electron desktop packaging with auto-update
- SQLite backend with migrations and seed data
- Express API with rate limiting, JWT auth, and role-based access

### Fixed
- API key passthrough from client to server for Gemini and Google Maps
- DevCoach multimodal bug reporting (voice dictation, screen recording)

---

## [1.0.0] — 2026-03-04

### Added
- Initial TaskPro CRM foundation
- Task management with drag-and-drop board
- Basic job and contact CRUD
- Vite + React + TypeScript frontend
- Express + SQLite backend
