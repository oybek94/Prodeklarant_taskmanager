# Copilot / AI Agent Instructions for Prodeklarant Task Manager

## Quick orientation ✅
- Monorepo with two main parts:
  - **backend/** — Node.js + TypeScript + Express + Prisma (PostgreSQL). Dev server: `cd backend && npm run dev` (uses `tsx`).
  - **frontend/** — React + TypeScript + Vite. Dev server: `cd frontend && npm run dev`.
- Key pattern: backend is the source of truth for business logic (statuses, AI checks, uploads), frontend is a thin client that calls `/api/*` endpoints.

## Most important files to read first 📚
- **AI & validation**: `backend/src/services/ai.service.ts`, `backend/AI_VALIDATION_README.md`
- **Server & middleware**: `backend/src/server.ts`, `backend/src/middleware/*` (auth + audit)
- **Database**: `backend/prisma/schema.prisma`, `backend/prisma/seed.ts`
- **Frontend API client**: `frontend/src/lib/api.ts` (look for `VITE_API_BASE_URL` usage)
- **Upload/Docs UI**: `frontend/src/pages/Tasks.tsx` (file download/upload handling)
- **Dev/test helper**: `test-archive-api.ts` (example script showing auth & task endpoints)

## Architecture & behavior notes (short, actionable) 🔧
- Database: **PostgreSQL** (see `schema.prisma`). Note: top-level README still mentions SQLite — ignore that (outdated).
- Auth: staff login uses `/api/auth/login` with a password; server then returns `accessToken` and `refreshToken`. Tokens stored in frontend localStorage and refreshed via `/api/auth/refresh`.
  - The login implementation compares the provided password to all user password hashes and returns the matching user — be careful when changing this logic (see `backend/src/routes/auth.ts`).
- Upload flow: POST `/api/tasks/:id/documents` (multipart/form-data, fields: `file`, `name`, `description`, `documentType`) — PDF text is extracted and, for `INVOICE`/`ST`, AI structuring runs automatically.
- AI checks: status changes to `ST_READY` trigger invoice-ST comparison. Results are saved to `aiCheck` table and available via `GET /api/tasks/:id/ai-checks`.
- Prompts & model: AI prompts are in `backend/src/services/ai.service.ts`. The code uses `openai` client with model `gpt-4o-mini` and expects JSON-only responses (service strips code fences and parses JSON). If you change prompt shapes, update `AI_VALIDATION_README.md` and tests.

## Environment variables & secrets (explicit) 🔐
- Backend (see `.env.example`):
  - `DATABASE_URL` (Postgres)
  - `JWT_SECRET`, `JWT_REFRESH_SECRET`
  - `PORT` (default 3001)
  - `OPENAI_API_KEY` — required for AI features (see `backend/AI_VALIDATION_README.md`)
  - `ALLOWED_ORIGINS` — CORS allowlist (comma-separated)
- Frontend: `VITE_API_BASE_URL` to override the default `/api` base.

## How to run (dev & common ops) ▶️
- Backend: 
  - Install: `cd backend && npm install`
  - Dev: `npm run dev` (uses `tsx watch src/server.ts`)
  - Build: `npm run build` → `node dist/index.js` to run production build
  - Migrations: `npm run prisma:migrate`; generate client: `npm run prisma:generate`; seed: `npm run prisma:seed`.
- Frontend:
  - Install: `cd frontend && npm install`
  - Dev: `npm run dev`
  - Build: `npm run build`
- Quick test script: `ts-node test-archive-api.ts` or compile & run with `node` — shows login and basic task endpoints.

## Changing AI behavior or prompts ✍️
- Edit prompts in `backend/src/services/ai.service.ts` (constants like `INVOICE_STRUCTURE_PROMPT`, `COMPARISON_PROMPT`). Keep these rules:
  - System message + very low `temperature` for deterministic JSON output
  - Return ONLY valid JSON (service strips code fences before JSON.parse)
- Update `backend/AI_VALIDATION_README.md` when you change prompts or the decision logic (PASS vs RETURNED).
- Add coverage (manual tests) that upload invoice & ST PDFs and assert contents saved to `StructuredDocument` and `AiCheck`.

## Conventions & gotchas ⚠️
- Validation: routes use `zod` heavily — follow existing validation patterns.
- Prisma & enums: some places use raw SQL queries to avoid enum issues (see `auth.ts`). If you add/remove enum values, update DB migration and check code that uses raw queries.
- Status transitions & AI: AI does not directly flip statuses — backend logic makes decision based on AI findings (see `AI_VALIDATION_README.md`).
- Missing DB tables: some endpoints gracefully handle the absence of new tables (e.g., `AiCheck`); take care when writing code that assumes migrations already applied.

## Testing checklist for PRs ✅
- If DB schema changes: add a Prisma migration & update `prisma/seed.ts` if needed; run `npx prisma migrate dev` locally and add migration files.
- Run backend dev server and verify basic flows:
  - Login (`/api/auth/login`) and `/api/auth/me`
  - Create a task and upload `INVOICE` + `ST` files → check `/api/tasks/:id/ai-checks`
- Update `AI_VALIDATION_README.md` for any AI/decision changes.

## Where to look for more context 🧭
- `backend/AI_VALIDATION_README.md` — architecture, rules, and example endpoints for AI checks
- `backend/scripts/` — data import/fix scripts (useful when preparing local DB data)
- `deploy.sh`, `deploy-remote.sh`, `deploy-commands.txt` — sample environment variables and deploy steps

---
If anything is unclear or you'd like the instructions to emphasize a different area (e.g., deployment, observability, or adding new AI checks), say which section to expand and I will iterate. ✅