import { Injectable, Logger } from '@nestjs/common';
import { JobHandler } from '../interfaces/job-handler.interface';
import { RawJob } from '../../core/jobs/raw-job.type';
import { JobType } from '../../core/jobs/job-types.enum';
import { PrismaService } from '../../core/database/prisma.service';
import { SystemLogService } from '../../system-log/system-log.service';

@Injectable()
export class SendRenewalReminderHandler implements JobHandler {
  readonly jobType = JobType.SEND_RENEWAL_REMINDER;
  private readonly logger = new Logger(SendRenewalReminderHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly systemLog: SystemLogService,
  ) {}

  async handle(job: RawJob): Promise<void> {
    const thirtyDaysOut = new Date();
    thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);

    const upcomingRenewals = await this.prisma.client.findMany({
      where: {
        orgId: job.org_id,
        renewalDate: { lte: thirtyDaysOut, gte: new Date() },
      },
      include: { lead: true },
    });

    for (const client of upcomingRenewals) {
      await this.systemLog.info('SendRenewalReminderHandler', `Renewal reminder: ${client.id}`, {
        clientId: client.id,
        renewalDate: client.renewalDate,
        leadName: client.lead.name,
      });
    }

    this.logger.log(`Sent ${upcomingRenewals.length} renewal reminders`);
  }
}
