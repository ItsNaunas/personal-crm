import { Injectable, Logger } from '@nestjs/common';
import { JobHandler } from '../interfaces/job-handler.interface';
import { RawJob } from '../../core/jobs/raw-job.type';
import { JobType } from '../../core/jobs/job-types.enum';
import { PrismaService } from '../../core/database/prisma.service';
import { SystemLogService } from '../../system-log/system-log.service';

interface RouteOutreachPayload {
  leadId: string;
}

@Injectable()
export class RouteOutreachHandler implements JobHandler {
  readonly jobType = JobType.ROUTE_OUTREACH;
  private readonly logger = new Logger(RouteOutreachHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly systemLog: SystemLogService,
  ) {}

  async handle(job: RawJob): Promise<void> {
    const { leadId } = job.payload as RouteOutreachPayload;

    const lead = await this.prisma.lead.findUniqueOrThrow({
      where: { id: leadId },
      select: { id: true, recommendedPath: true, name: true, email: true },
    });

    this.logger.log(`Routing lead ${leadId} via path: ${lead.recommendedPath ?? 'unknown'}`);

    switch (lead.recommendedPath) {
      case 'direct_call':
        await this.systemLog.info('RouteOutreachHandler', `Lead ${leadId} flagged for direct call`, { leadId });
        break;
      case 'outreach':
        await this.systemLog.info('RouteOutreachHandler', `Lead ${leadId} queued for cold outreach`, { leadId });
        break;
      case 'nurture':
        await this.systemLog.info('RouteOutreachHandler', `Lead ${leadId} added to nurture sequence`, { leadId });
        break;
      case 'ignore':
        this.logger.debug(`Lead ${leadId} path is ignore — no outreach`);
        break;
      default:
        this.logger.warn(`Lead ${leadId} has no recommended path set`);
    }
  }
}
