-- Create offer_type enum
CREATE TYPE "offer_type" AS ENUM ('website_install', 'lifecycle_install', 'lead_control', 'sales_optimisation', 'retention');

-- Add offer_type column to deals (nullable)
ALTER TABLE "deals" ADD COLUMN "offer_type" "offer_type";
