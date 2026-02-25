import { Injectable, Logger } from '@nestjs/common';
import { JobHandler } from '../interfaces/job-handler.interface';
import { RawJob } from '../../core/jobs/raw-job.type';
import { JobType } from '../../core/jobs/job-types.enum';
import { PrismaService } from '../../core/database/prisma.service';
import { WebhookService } from '../../webhook/webhook.service';

interface GenerateContractPayload {
  dealId: string;
}

// Contracts are NOT auto-generated. Founder sends contracts manually.
// This handler notifies the founder that a deal is won and a contract needs to be sent.
@Injectable()
export class GenerateContractHandler implements JobHandler {
  readonly jobType = JobType.GENERATE_CONTRACT;
  private readonly logger = new Logger(GenerateContractHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly webhook: WebhookService,
  ) {}

  async handle(job: RawJob): Promise<void> {
    const { dealId } = job.payload as GenerateContractPayload;

    const deal = await this.prisma.deal.findUniqueOrThrow({
      where: { id: dealId },
      include: {
        lead: { select: { name: true, email: true, companyName: true } },
        invoices: { select: { id: true, amount: true } },
      },
    });

    const invoice = deal.invoices[0];

    // Notify founder to manually create and send the contract
    await this.webhook.trigger(
      this.webhook.getWebhookUrl('onboarding' as never),
      {
        action: 'contract_required',
        dealId,
        leadName: deal.lead.name,
        email: deal.lead.email,
        companyName: deal.lead.companyName,
        dealValue: deal.dealValue,
        offerType: deal.offerType,
        invoiceId: invoice?.id,
        invoiceAmount: invoice?.amount,
      },
    );

    this.logger.log(`Contract notification sent for deal ${dealId} — ${deal.lead.name} (${deal.lead.companyName})`);
  }
}
