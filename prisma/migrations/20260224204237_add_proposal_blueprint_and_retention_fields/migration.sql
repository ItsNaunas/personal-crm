-- AlterTable
ALTER TABLE "calls" ADD COLUMN     "proposal_blueprint" TEXT;

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "referral_prompt_sent_at" TIMESTAMP(3),
ADD COLUMN     "testimonial_sent_at" TIMESTAMP(3),
ADD COLUMN     "upsell_flagged_at" TIMESTAMP(3);
