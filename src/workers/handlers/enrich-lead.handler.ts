import { Injectable, Logger } from '@nestjs/common';
import { JobHandler } from '../interfaces/job-handler.interface';
import { RawJob } from '../../core/jobs/raw-job.type';
import { JobType } from '../../core/jobs/job-types.enum';
import { EnrichmentService } from '../../enrichment/enrichment.service';

interface EnrichLeadPayload {
  leadId: string;
}

@Injectable()
export class EnrichLeadHandler implements JobHandler {
  readonly jobType = JobType.ENRICH_LEAD;
  private readonly logger = new Logger(EnrichLeadHandler.name);

  constructor(private readonly enrichmentService: EnrichmentService) {}

  async handle(job: RawJob): Promise<void> {
    const { leadId } = job.payload as EnrichLeadPayload;
    this.logger.debug(`Enriching lead ${leadId}`);
    await this.enrichmentService.enrich(leadId, job.org_id);
  }
}
