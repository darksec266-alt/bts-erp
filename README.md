# Brother's Technology System — Unified Business Management Platform

A 75-module ERP (Inventory, Sales, Procurement, Field Service,
Finance/Accounting, HR/Payroll, Portals) built in-house for Brother's
Technology System.

**Status:** Phase 0 (Project Scaffold) — see `docs/PROGRESS.md` for the full
21-phase build status and `docs/HANDOFF.md` for the current session record.

## Full specification

Everything about *what* to build and *why* lives in `/docs` — read
`docs/CLAUDE.md` first if you're picking up development; it lists the
required reading order (`docs/AGENT.md`'s Startup Protocol, `docs/HANDOFF.md`,
`docs/PROGRESS.md`, then the relevant spec document per phase/module).

| Document | Covers |
|---|---|
| `docs/prd.md` | Product requirements — all 75 modules |
| `docs/architecture.md` | Technical architecture, DDD layers, domain events |
| `docs/database-schema.md` / `docs/database.md` | Full ~86-table schema, RLS |
| `docs/api-spec.md` | API contract, all endpoints |
| `docs/ui.md` | Design system, tokens, per-role dashboards |
| `docs/prompt.md` | 300-section master build prompt, 21 build phases |
| `docs/AGENT.md` | AI-agent build rules, handoff/continuity protocol |
| `docs/Accounting_and_Finance_Full_Specification.md` | Full finance/accounting model |
| `docs/data-integrity-and-reconciliation.md` | 101-point integrity & reconciliation rulebook |

## Repository layout

```
apps/
  web/      — Next.js frontend
  api/      — Express modular-monolith API (+ worker.ts entrypoint for BullMQ)
packages/
  db/       — Prisma schema, migrations, seed
  shared-types/ — DTOs shared between web and api
  ui/       — shared component library (ui.md v3.0)
  export-engine/ — CSV/PDF/DOCX/XML + print/letterhead engine
  config/   — zod env schema
infra/
  nginx/    — edge/reverse-proxy config (architecture_nginx.md)
  docker/   — Dockerfiles
docs/       — the full specification set (source of truth — see above)
```

## Local development

```bash
cp .env.example .env
docker compose up
```

- Web: http://localhost/ (or http://localhost:3000 directly)
- API health check: http://localhost/health
- Postgres: localhost:5432 · Redis: localhost:6379 (dev only — see
  `docker-compose.yml`'s header comment)

Without Docker (services running natively):

```bash
npm install
npm run db:generate
npm run dev
```

## Production

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

See `docs/production_postgresql_pgadmin_prisma_secure_setup.md` for VPS
sizing, backup strategy, and the full security checklist before any real
deployment.
