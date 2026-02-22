import { Injectable, Logger } from '@nestjs/common';
import { JobHandler } from '../interfaces/job-handler.interface';
import { RawJob } from '../../core/jobs/raw-job.type';
import { JobType } from '../../core/jobs/job-types.enum';
import { InvoicesService } from '../../invoices/invoices.service';

interface CreateInvoicePayload {
  dealId: string;
}

@Injectable()
export class CreateInvoiceHandler implements JobHandler {
  readonly jobType = JobType.CREATE_INVOICE;
  private readonly logger = new Logger(CreateInvoiceHandler.name);

  constructor(private readonly invoicesService: InvoicesService) {}

  async handle(job: RawJob): Promise<void> {
    const { dealId } = job.payload as CreateInvoicePayload;
    this.logger.log(`Creating invoice for deal ${dealId}`);
    await this.invoicesService.createForDeal(dealId, job.org_id);
  }
}
