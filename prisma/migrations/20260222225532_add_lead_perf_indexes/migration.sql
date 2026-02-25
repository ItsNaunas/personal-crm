-- CreateIndex
CREATE INDEX "leads_org_id_created_at_idx" ON "leads"("org_id", "created_at");

-- CreateIndex
CREATE INDEX "leads_org_id_priority_idx" ON "leads"("org_id", "priority");

-- CreateIndex
CREATE INDEX "leads_org_id_temperature_idx" ON "leads"("org_id", "temperature");

-- CreateIndex
CREATE INDEX "leads_org_id_next_action_idx" ON "leads"("org_id", "next_action");

-- CreateIndex
CREATE INDEX "leads_org_id_recommended_path_idx" ON "leads"("org_id", "recommended_path");
