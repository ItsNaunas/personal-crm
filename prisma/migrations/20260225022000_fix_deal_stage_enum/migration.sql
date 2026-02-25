-- Rename discovery -> diagnostic and remove negotiation from deal_stage enum
-- PostgreSQL doesn't support removing enum values, so we rename discovery and leave negotiation

ALTER TYPE "deal_stage" RENAME VALUE 'discovery' TO 'diagnostic';

-- Update the default value on the column
ALTER TABLE "deals" ALTER COLUMN "stage" SET DEFAULT 'diagnostic';
