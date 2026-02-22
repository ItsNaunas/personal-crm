-- CreateEnum
CREATE TYPE "lifecycle_stage" AS ENUM ('new_lead', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost');

-- CreateEnum
CREATE TYPE "Temperature" AS ENUM ('cold', 'warm', 'hot');

-- CreateEnum
CREATE TYPE "recommended_path" AS ENUM ('outreach', 'nurture', 'direct_call', 'ignore');

-- CreateEnum
CREATE TYPE "deal_stage" AS ENUM ('discovery', 'proposal', 'negotiation', 'won', 'lost');

-- CreateEnum
CREATE TYPE "call_status" AS ENUM ('booked', 'completed', 'no_show');

-- CreateEnum
CREATE TYPE "intake_source" AS ENUM ('csv', 'form', 'webhook');

-- CreateEnum
CREATE TYPE "job_status" AS ENUM ('pending', 'running', 'failed', 'completed');

-- CreateEnum
CREATE TYPE "invoice_status" AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');

-- CreateEnum
CREATE TYPE "log_level" AS ENUM ('debug', 'info', 'warn', 'error');

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "profile_link" TEXT,
    "company_name" TEXT,
    "domain" TEXT,
    "industry" TEXT,
    "employee_count" INTEGER,
    "revenue_band" TEXT,
    "location" TEXT,
    "lead_source" TEXT,
    "lifecycle_stage" "lifecycle_stage" NOT NULL DEFAULT 'new_lead',
    "qualification_score" DOUBLE PRECISION,
    "temperature" "Temperature",
    "recommended_path" "recommended_path",
    "estimated_monthly_revenue_leak" DOUBLE PRECISION,
    "buying_signal_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ghost_risk_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "interest_profile" JSONB,
    "last_state_change" TIMESTAMP(3),

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deals" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "lead_id" TEXT NOT NULL,
    "stage" "deal_stage" NOT NULL DEFAULT 'discovery',
    "deal_value" DOUBLE PRECISION NOT NULL,
    "probability" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lost_reason" TEXT,
    "stage_last_changed_at" TIMESTAMP(3),

    CONSTRAINT "deals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calls" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "lead_id" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "status" "call_status" NOT NULL DEFAULT 'booked',
    "transcript" TEXT,
    "ai_summary" TEXT,
    "outcome" TEXT,
    "buying_signals_detected" JSONB,

    CONSTRAINT "calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "lead_id" TEXT NOT NULL,
    "deal_id" TEXT NOT NULL,
    "onboarding_status" TEXT,
    "delivery_status" TEXT,
    "renewal_date" TIMESTAMP(3),
    "churn_risk_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "satisfaction_score" DOUBLE PRECISION,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deal_id" TEXT NOT NULL,
    "client_id" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "invoice_status" NOT NULL DEFAULT 'draft',
    "due_date" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "contract_url" TEXT,
    "contract_signed" BOOLEAN NOT NULL DEFAULT false,
    "contract_signed_at" TIMESTAMP(3),

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "activity_type" TEXT NOT NULL,
    "payload" JSONB,
    "metadata" JSONB,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_intake_raw" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "raw_payload" JSONB NOT NULL,
    "source" "intake_source" NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "duplicate_flag" BOOLEAN NOT NULL DEFAULT false,
    "error_flag" BOOLEAN NOT NULL DEFAULT false,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "lead_intake_raw_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "event_type" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "payload" JSONB,
    "metadata" JSONB,
    "idempotency_key" TEXT,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "event_id" TEXT,
    "job_type" TEXT NOT NULL,
    "status" "job_status" NOT NULL DEFAULT 'pending',
    "idempotency_key" TEXT,
    "payload" JSONB,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "scheduled_for" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "locked_at" TIMESTAMP(3),
    "locked_by" TEXT,
    "last_error" TEXT,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dead_letter_jobs" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "original_job_id" TEXT NOT NULL,
    "event_id" TEXT,
    "job_type" TEXT NOT NULL,
    "idempotency_key" TEXT,
    "payload" JSONB,
    "attempts" INTEGER NOT NULL,
    "max_attempts" INTEGER NOT NULL,
    "last_error" TEXT,
    "failed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dead_letter_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cron_tasks" (
    "id" TEXT NOT NULL,
    "org_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "task_type" TEXT NOT NULL,
    "cron_expression" TEXT NOT NULL,
    "config" JSONB,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "last_run_at" TIMESTAMP(3),
    "next_run_at" TIMESTAMP(3),

    CONSTRAINT "cron_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_tasks" (
    "id" TEXT NOT NULL,
    "org_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "task_type" TEXT NOT NULL,
    "execute_at" TIMESTAMP(3) NOT NULL,
    "config" JSONB,
    "executed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "scheduled_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_logs" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "level" "log_level" NOT NULL,
    "source" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "context" JSONB,

    CONSTRAINT "system_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "leads_org_id_lifecycle_stage_idx" ON "leads"("org_id", "lifecycle_stage");

-- CreateIndex
CREATE INDEX "leads_org_id_last_state_change_idx" ON "leads"("org_id", "last_state_change");

-- CreateIndex
CREATE INDEX "deals_org_id_stage_idx" ON "deals"("org_id", "stage");

-- CreateIndex
CREATE INDEX "deals_lead_id_idx" ON "deals"("lead_id");

-- CreateIndex
CREATE INDEX "calls_org_id_status_idx" ON "calls"("org_id", "status");

-- CreateIndex
CREATE INDEX "calls_lead_id_idx" ON "calls"("lead_id");

-- CreateIndex
CREATE INDEX "clients_org_id_idx" ON "clients"("org_id");

-- CreateIndex
CREATE INDEX "invoices_org_id_status_idx" ON "invoices"("org_id", "status");

-- CreateIndex
CREATE INDEX "invoices_deal_id_idx" ON "invoices"("deal_id");

-- CreateIndex
CREATE INDEX "activities_org_id_entity_type_entity_id_idx" ON "activities"("org_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "lead_intake_raw_org_id_fingerprint_idx" ON "lead_intake_raw"("org_id", "fingerprint");

-- CreateIndex
CREATE INDEX "lead_intake_raw_processed_source_idx" ON "lead_intake_raw"("processed", "source");

-- CreateIndex
CREATE UNIQUE INDEX "events_idempotency_key_key" ON "events"("idempotency_key");

-- CreateIndex
CREATE INDEX "events_org_id_created_at_idx" ON "events"("org_id", "created_at");

-- CreateIndex
CREATE INDEX "events_event_type_created_at_idx" ON "events"("event_type", "created_at");

-- CreateIndex
CREATE INDEX "jobs_status_scheduled_for_idx" ON "jobs"("status", "scheduled_for");

-- CreateIndex
CREATE INDEX "jobs_org_id_status_idx" ON "jobs"("org_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "jobs_job_type_idempotency_key_key" ON "jobs"("job_type", "idempotency_key");

-- CreateIndex
CREATE INDEX "dead_letter_jobs_org_id_idx" ON "dead_letter_jobs"("org_id");

-- CreateIndex
CREATE INDEX "cron_tasks_enabled_next_run_at_idx" ON "cron_tasks"("enabled", "next_run_at");

-- CreateIndex
CREATE INDEX "scheduled_tasks_executed_execute_at_idx" ON "scheduled_tasks"("executed", "execute_at");

-- CreateIndex
CREATE INDEX "system_logs_level_created_at_idx" ON "system_logs"("level", "created_at");

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calls" ADD CONSTRAINT "calls_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
