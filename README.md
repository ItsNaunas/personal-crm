# Personal CRM

Production-grade, state-driven CRM with an internal workflow engine. Built with NestJS, Prisma, and PostgreSQL.

---

## Architecture Overview

```
Webhook / CSV / Form
        │
        ▼
┌───────────────┐
│ lead_intake_  │  ← fingerprint dedup, never mutates business state
│ raw (buffer)  │
└──────┬────────┘
       │ process_intake job
       ▼
┌───────────────┐   lead.created event
│  Leads Table  │ ─────────────────────────┐
└───────────────┘                          │
                                           ▼
                                  ┌─────────────────┐
                                  │  Job Queue      │  ← SELECT FOR UPDATE SKIP LOCKED
                                  │  (jobs table)   │
                                  └────────┬────────┘
                                           │
                              ┌────────────▼────────────┐
                              │     Worker Pool (N)     │
                              │  ┌─────────────────────┐│
                              │  │  Handler Registry   ││
                              │  └─────────────────────┘│
                              └─────────────────────────┘
                                           │
          ┌────────────────────────────────┼─────────────────────────────┐
          │                               │                              │
          ▼                               ▼                              ▼
  EnrichmentService            QualificationService            ... other handlers
  (domain, revenue band)       (AI scoring, ICP match)
```

### Core Principle: Everything is State-Driven

1. **All state changes emit events** → persisted to `events` table (immutable, append-only)
2. **Events trigger jobs** → via `EVENT_JOB_MAP` config
3. **Jobs are processed by workers** → using `SELECT FOR UPDATE SKIP LOCKED`
4. **Webhooks never mutate business state** → write to `lead_intake_raw` only
5. **AI classifies, never confirms financial state**

---

## Stack

| Layer | Choice |
|-------|--------|
| Framework | NestJS 10 |
| ORM | Prisma 5 |
| Database | PostgreSQL 16 |
| Queue | Custom — `jobs` table, `SELECT FOR UPDATE SKIP LOCKED` |
| AI | OpenAI (configurable) |
| Scheduler | Custom — `cron_tasks` + `scheduled_tasks` tables |

---

## Quick Start

For a **step-by-step automation checklist** (what to connect, what to verify, how to test each flow), see **[AUTOMATION_SETUP.md](./AUTOMATION_SETUP.md)**.

### 1. Start the database

```bash
docker-compose up -d
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env with your DATABASE_URL, OPENAI_API_KEY, etc.
```

### 4. Run migrations and seed

```bash
npm run prisma:migrate
npm run prisma:seed
```

The seed creates system cron tasks (deal decay, lead stale, auto-priority, ghost risk, renewal reminder, weekly report, integrity watchdog). Without it, the scheduler has nothing to run.

### 5. Start the application

```bash
# Development (API + workers + scheduler in one process)
npm run start:dev

# Production
npm run build
npm run start:prod
```

The API starts on `http://localhost:3000`.
Swagger docs at `http://localhost:3000/api/docs`.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | — | PostgreSQL connection string |
| `OPENAI_API_KEY` | — | OpenAI API key |
| `AI_MODEL` | `gpt-4o` | AI model to use |
| `WORKER_ENABLED` | `true` | Enable background workers |
| `WORKER_CONCURRENCY` | `2` | Number of concurrent worker loops |
| `WORKER_POLL_INTERVAL_MS` | `1000` | Poll interval when queue is empty |
| `WORKER_LOCK_TIMEOUT_MINUTES` | `10` | Stuck job reaper threshold |
| `JOB_BASE_DELAY_MS` | `5000` | Base delay for exponential backoff |
| `JOB_MAX_ATTEMPTS` | `3` | Max retries before dead-letter |
| `SCHEDULER_ENABLED` | `true` | Enable scheduler |
| `SCHEDULER_POLL_INTERVAL_MS` | `60000` | Scheduler poll interval |
| `ENRICHMENT_API_URL` | — | External enrichment API URL |
| `ENRICHMENT_API_KEY` | — | External enrichment API key |
| `BUYING_SIGNAL_THRESHOLD` | `75` | Score threshold to escalate lead |
| `GHOST_RISK_SILENCE_DAYS` | `7` | Days of silence before ghost risk increments |
| `DEAL_DECAY_THRESHOLD_DAYS` | `14` | Days in same stage before deal.stalled |

---

## Multi-tenancy

All tables have `org_id UUID NOT NULL`. Pass the `x-org-id` header on every API request.

---

## API Endpoints

| Module | Base Path | Key Operations |
|--------|-----------|----------------|
| Intake | `/intake` | `POST /csv`, `POST /form`, `POST /webhook` |
| Leads | `/leads` | CRUD, `/stage`, `/activities` |
| Calls | `/calls` | Book, complete (with transcript), no-show |
| Deals | `/deals` | CRUD, `/stage` (enforced transitions) |
| Clients | `/clients` | List, get, update status |
| Analytics | `/analytics` | `/dashboard`, `/pipeline`, `/velocity`, `/funnel` |
| Observability | `/observability` | Jobs, events, logs, integrity alerts |

---

## Event Types Reference

| Event | Triggered By | Downstream Jobs |
|-------|-------------|-----------------|
| `lead.created` | Intake, manual | `enrich_lead`, `qualify_lead` |
| `lead.enriched` | EnrichmentService | — |
| `lead.qualified` | QualificationService | `route_outreach` |
| `buying_signal.high` | AnalyzeCallHandler | `escalate_lead` |
| `call.completed` | CallsService | `analyze_call` |
| `deal.won` | DealsService | `create_invoice`, `generate_contract` |
| `deal.stalled` | CheckDealDecayHandler | `nudge_deal` |
| `invoice.paid` | InvoicesService | `create_client` |
| `client.created` | CreateClientHandler | `start_onboarding` |
| `system.integrity_alert` | CheckIntegrityHandler | — |

---

## Job Types Reference

| Job | Handler | Description |
|-----|---------|-------------|
| `process_intake` | ProcessIntakeHandler | Deduplicate and create lead from raw intake |
| `enrich_lead` | EnrichLeadHandler | Domain extraction + external API enrichment |
| `qualify_lead` | QualifyLeadHandler | AI-based ICP scoring and path assignment |
| `route_outreach` | RouteOutreachHandler | Route lead based on recommended_path |
| `analyze_call` | AnalyzeCallHandler | AI call summary + buying signal detection |
| `create_invoice` | CreateInvoiceHandler | Generate invoice on deal won |
| `generate_contract` | GenerateContractHandler | Generate and attach contract URL |
| `create_client` | CreateClientHandler | Create client record on invoice paid |
| `start_onboarding` | StartOnboardingHandler | Begin client onboarding |
| `check_deal_decay` | CheckDealDecayHandler | Emit deal.stalled for stuck deals |
| `check_lead_stale` | CheckLeadStaleHandler | Emit lead.stale for inactive leads |
| `recalc_ghost_risk` | RecalcGhostRiskHandler | Increment ghost risk for silent leads |
| `check_integrity` | CheckIntegrityHandler | State invariant checks |
| `generate_weekly_report` | GenerateWeeklyReportHandler | AI executive report |

---

## Weighted Deal Value

`weighted_value` is **never stored** as a column. It is always computed:

```sql
SELECT deal_value * probability AS weighted_value FROM deals WHERE ...
```

In API responses, `weightedValue` is a computed field added by `DealsService`.

---

## Idempotency

- **Jobs**: unique index on `(job_type, idempotency_key)`. Duplicate enqueue silently discards.
- **Events**: unique `idempotency_key` column. Duplicate emit returns existing event.
- **Intake**: `fingerprint` (SHA-256 of email+domain+profile_link) prevents double-processing.

---

## Worker Internals

```
WorkerProcessor.onModuleInit()
  └── spawn N worker loops (WORKER_CONCURRENCY)
        │
        └── loop:
              ├── JobsService.claimNext(workerId)
              │     └── SELECT ... FOR UPDATE SKIP LOCKED → UPDATE status=running, locked_at, locked_by
              ├── HandlerRegistry.get(job_type).handle(job)
              ├── JobsService.complete(jobId)  ← on success
              └── JobsService.fail(jobId, err) ← on failure
                    ├── attempts < max_attempts → reschedule with exponential backoff
                    └── attempts >= max_attempts → move to dead_letter_jobs

  └── spawn reaper loop (every 60s)
        └── Reset stuck running jobs (locked_at older than WORKER_LOCK_TIMEOUT_MINUTES)
```

---

## Build Phases

- [x] Phase 1: Schema + Event System + Job Queue + Worker
- [x] Phase 2: Intake + Enrichment + Qualification
- [x] Phase 3: Call Engine + Deal Engine
- [x] Phase 4: Invoice + Onboarding
- [x] Phase 5: Advanced intelligence features

---

## Development Notes

- Add new job handlers in `src/workers/handlers/`, implement `JobHandler` interface, register in `WorkersModule`.
- Add new event → job mappings in `src/core/events/event-job-mapping.constant.ts`.
- Add new cron tasks in `prisma/seed.ts`.
- All business logic belongs in `*Service` classes — controllers are thin, handlers are thin.
