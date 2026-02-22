import { Injectable, Logger } from '@nestjs/common';
import { JobHandler } from '../interfaces/job-handler.interface';
import { RawJob } from '../../core/jobs/raw-job.type';
import { JobType } from '../../core/jobs/job-types.enum';
import { QualificationService } from '../../qualification/qualification.service';

interface QualifyLeadPayload {
  leadId: string;
}

@Injectable()
export class QualifyLeadHandler implements JobHandler {
  readonly jobType = JobType.QUALIFY_LEAD;
  private readonly logger = new Logger(QualifyLeadHandler.name);

  constructor(private readonly qualificationService: QualificationService) {}

  async handle(job: RawJob): Promise<void> {
    const { leadId } = job.payload as QualifyLeadPayload;
    this.logger.debug(`Qualifying lead ${leadId}`);
    await this.qualificationService.qualify(leadId, job.org_id);
  }
}
