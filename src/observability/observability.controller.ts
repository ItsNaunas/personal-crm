import { Controller, Get, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PrismaService } from '../core/database/prisma.service';
import { JobsService } from '../core/jobs/jobs.service';
import { OrgId } from '../common/decorators/org-id.decorator';

@ApiTags('observability')
@Controller('observability')
export class ObservabilityController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobsService: JobsService,
  ) {}

  @Get('jobs/pending')
  @ApiOperation({ summary: 'List pending jobs' })
  pendingJobs(@OrgId() orgId: string) {
    return this.prisma.job.findMany({
      where: { orgId, status: 'pending' },
      orderBy: { scheduledFor: 'asc' },
      take: 100,
    });
  }

  @Get('jobs/running')
  @ApiOperation({ summary: 'List currently running jobs' })
  runningJobs(@OrgId() orgId: string) {
    return this.prisma.job.findMany({
      where: { orgId, status: 'running' },
      orderBy: { lockedAt: 'asc' },
      take: 50,
    });
  }

  @Get('jobs/failed')
  @ApiOperation({ summary: 'List failed jobs' })
  failedJobs(@OrgId() orgId: string) {
    return this.jobsService.getFailedJobs(orgId);
  }

  @Get('jobs/dead-letter')
  @ApiOperation({ summary: 'List dead-letter jobs' })
  deadLetterJobs(@OrgId() orgId: string) {
    return this.jobsService.getDeadLetterJobs(orgId);
  }

  @Get('scheduler/upcoming')
  @ApiOperation({ summary: 'List upcoming cron tasks' })
  upcomingCronTasks() {
    return this.prisma.cronTask.findMany({
      where: { enabled: true },
      orderBy: { nextRunAt: 'asc' },
    });
  }

  @Get('scheduler/one-off')
  @ApiOperation({ summary: 'List pending one-off scheduled tasks' })
  pendingOneOffTasks() {
    return this.prisma.scheduledTask.findMany({
      where: { executed: false },
      orderBy: { executeAt: 'asc' },
      take: 50,
    });
  }

  @Get('events')
  @ApiOperation({ summary: 'Recent event stream' })
  @ApiQuery({ name: 'limit', required: false })
  eventStream(
    @OrgId() orgId: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.prisma.event.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 200),
    });
  }

  @Get('logs')
  @ApiOperation({ summary: 'Recent system logs' })
  @ApiQuery({ name: 'level', required: false })
  @ApiQuery({ name: 'limit', required: false })
  systemLogs(
    @Query('level') level?: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
  ) {
    return this.prisma.systemLog.findMany({
      where: level ? { level: level as 'debug' | 'info' | 'warn' | 'error' } : undefined,
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit ?? 50, 200),
    });
  }

  @Get('integrity/alerts')
  @ApiOperation({ summary: 'Recent integrity alerts' })
  integrityAlerts(@OrgId() orgId: string) {
    return this.prisma.event.findMany({
      where: { orgId, eventType: 'system.integrity_alert' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
