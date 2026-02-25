-- ============================================================
-- Sync all missing schema columns/enums to the database
-- Identified gaps vs init + all subsequent migrations:
--   1. delivery_phase enum missing entirely
--   2. onboarding_status enum missing entirely
--   3. clients.delivery_status (TEXT) must become delivery_phase (enum)
--   4. clients.onboarding_status (TEXT) must become onboarding_status enum
-- ============================================================

-- Step 1: Create the missing enums (idempotent via DO block)
DO $$ BEGIN
  CREATE TYPE "delivery_phase" AS ENUM (
    'system_design',
    'crm_build',
    'automation_build',
    'handover',
    'live',
    'complete'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "onboarding_status" AS ENUM (
    'pending',
    'in_progress',
    'complete'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Step 2: Migrate clients.onboarding_status from TEXT -> onboarding_status enum
-- The column exists as TEXT from the init migration; cast safely.
ALTER TABLE "clients"
  ALTER COLUMN "onboarding_status"
  TYPE "onboarding_status"
  USING CASE
    WHEN "onboarding_status" = 'pending'     THEN 'pending'::onboarding_status
    WHEN "onboarding_status" = 'in_progress' THEN 'in_progress'::onboarding_status
    WHEN "onboarding_status" = 'complete'    THEN 'complete'::onboarding_status
    ELSE NULL
  END;

-- Set the column default now that it has the correct type
ALTER TABLE "clients"
  ALTER COLUMN "onboarding_status" SET DEFAULT 'pending'::"onboarding_status";

-- Step 3: Rename clients.delivery_status -> delivery_phase and change type to enum
-- The init migration created this column as "delivery_status" TEXT.
-- The Prisma schema maps the field as "delivery_phase" TEXT column name.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'delivery_status'
  ) THEN
    ALTER TABLE "clients" RENAME COLUMN "delivery_status" TO "delivery_phase";
  END IF;
END $$;

-- Now cast the renamed column from TEXT to the delivery_phase enum
ALTER TABLE "clients"
  ALTER COLUMN "delivery_phase"
  TYPE "delivery_phase"
  USING CASE
    WHEN "delivery_phase" = 'system_design'     THEN 'system_design'::delivery_phase
    WHEN "delivery_phase" = 'crm_build'         THEN 'crm_build'::delivery_phase
    WHEN "delivery_phase" = 'automation_build'  THEN 'automation_build'::delivery_phase
    WHEN "delivery_phase" = 'handover'          THEN 'handover'::delivery_phase
    WHEN "delivery_phase" = 'live'              THEN 'live'::delivery_phase
    WHEN "delivery_phase" = 'complete'          THEN 'complete'::delivery_phase
    ELSE NULL
  END;
