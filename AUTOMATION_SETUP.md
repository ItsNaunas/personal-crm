# Automation setup & checklist

Use this to get all automations working and to verify everything is connected correctly.

---

## 1. Must-have connections

| What | Why | How to verify |
|------|-----|----------------|
| **PostgreSQL** | All state, jobs, events, cron tasks | `docker-compose up -d` then `npm run prisma:migrate` — no errors |
| **Database seed** | Creates the 7 system cron tasks the scheduler runs | `npm run prisma:seed` then check `GET /observability/scheduler/upcoming` returns tasks |
| **DEFAULT_ORG_ID** | Web app and API use this when `x-org-id` isn’t set | Set in `.env` to a stable UUID; `GET /org/default` should return it |
| **OPENAI_API_KEY** | Needed for `qualify_lead`, `analyze_call`, `generate_weekly_report` | Set in `.env`; if missing, app logs a warning at startup and those jobs will fail |

---

## 2. Optional connections

| What | Used by | If not set |
|------|---------|------------|
| **ENRICHMENT_API_URL** + **ENRICHMENT_API_KEY** | `enrich_lead` (external company/contact data) | Enrichment still runs: domain from email, revenue band from employee count; no external API call |
| **Webhook source** (Zapier, n8n, form backend, etc.) | `POST /intake/webhook` to create leads from external systems | You can use CSV/form intake only |

---

## 3. What to work on (in order)

### Step 1: Infrastructure

- [ ] Start DB: `docker-compose up -d`
- [ ] Migrate: `npm run prisma:migrate`
- [ ] Seed cron tasks: `npm run prisma:seed`
- [ ] In `.env`: set `DATABASE_URL`, `DEFAULT_ORG_ID`, and `OPENAI_API_KEY` (for AI jobs)

### Step 2: Confirm workers & scheduler

- [ ] Start app: `npm run dev` (or `npm run start:dev`)
- [ ] In logs you should see: `WorkerProcessor ... Started 2 worker loop(s)` and `SchedulerService Scheduler started`
- [ ] Open `GET http://localhost:3000/observability/scheduler/upcoming` — you should see 7 cron tasks with `nextRunAt` set

### Step 3: Test intake → lead → jobs

- [ ] Send a test lead so a job runs:
  - `POST http://localhost:3000/intake/form`  
    Headers: `x-org-id: <your DEFAULT_ORG_ID>`  
    Body (JSON): `{ "name": "Test Lead", "email": "test@example.com" }`
- [ ] Check `GET /observability/jobs/pending` or `/jobs/running` — you should see `process_intake`, then `enrich_lead` and `qualify_lead` (if OPENAI is set)
- [ ] Check `GET /leads` — the new lead should appear

### Step 4: Optional — connect a webhook

- [ ] Use the same org: `x-org-id: <DEFAULT_ORG_ID>`
- [ ] Endpoint: `POST http://localhost:3000/intake/webhook`  
  Body: `{ "payload": { "name": "Webhook Lead", "email": "webhook@example.com" } }`
- [ ] In Zapier/n8n/your tool: add a “Webhooks by Zapier” or HTTP request action pointing to this URL with header `x-org-id`

### Step 5: Optional — enrichment API

- [ ] If you have an enrichment provider (Clearbit, Apollo, etc.), set `ENRICHMENT_API_URL` and `ENRICHMENT_API_KEY` in `.env`
- [ ] Enrichment runs automatically after each new lead; you can also trigger it manually: `POST /leads/:id/enrich` with `x-org-id`

---

## 4. Quick verification endpoints

Call these to confirm everything is wired:

| Endpoint | What it tells you |
|----------|--------------------|
| `GET /org/default` | Default org ID (from DEFAULT_ORG_ID) |
| `GET /observability/scheduler/upcoming` | Cron tasks exist and next run times (seed worked) |
| `GET /observability/jobs/pending` | Jobs waiting to run |
| `GET /observability/jobs/failed` | Recent failures (e.g. missing OPENAI key) |
| `GET /observability/jobs/dead-letter` | Jobs that exhausted retries |
| `GET /observability/events` | Recent events (lead created, etc.) |
| `GET /observability/logs` | System log entries (errors, dead-letters) |

---

## 5. Automation flow summary

| Trigger | Event / job chain | Depends on |
|---------|--------------------|------------|
| CSV / form / webhook intake | `process_intake` → lead → `enrich_lead` + `qualify_lead` | DB, OPENAI for qualify |
| Lead qualified | `route_outreach` | DB only |
| Call completed | `analyze_call` | OPENAI |
| Deal won | `create_invoice`, `generate_contract` | DB |
| Deal stalled (scheduler) | `check_deal_decay` → `nudge_deal` | DB, seed |
| Lead stale (scheduler) | `check_lead_stale` | DB, seed |
| Hourly (scheduler) | `integrity_watchdog` | DB, seed |
| Weekly (scheduler) | `generate_weekly_report` | DB, OPENAI, seed |
| Invoice paid | `create_client` → `start_onboarding` | DB |

---

## 6. If something isn’t working

- **No cron runs:** Run `npm run prisma:seed` and check `GET /observability/scheduler/upcoming`.
- **Jobs stuck in pending:** Workers might be off — ensure `WORKER_ENABLED=true` and restart; check logs for “WorkerProcessor … Started”.
- **Jobs failing / dead-letter:** Check `GET /observability/jobs/failed` and `GET /observability/jobs/dead-letter`; check `GET /observability/logs` for error context. Common cause: missing or invalid `OPENAI_API_KEY` for qualify_lead, analyze_call, or generate_weekly_report.
- **Webhook not creating leads:** Ensure `x-org-id` header is set and body is `{ "payload": { ... } }` with at least `name`; check intake duplicates (same email/domain/profile_link skips create).
