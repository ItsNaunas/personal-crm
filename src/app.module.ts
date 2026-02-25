import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import configuration from './config/configuration';
import { ApiKeyGuard } from './common/guards/api-key.guard';

import { DatabaseModule } from './core/database/database.module';
import { SystemLogModule } from './system-log/system-log.module';
import { JobsModule } from './core/jobs/jobs.module';
import { EventsModule } from './core/events/events.module';

import { IntakeModule } from './intake/intake.module';
import { EnrichmentModule } from './enrichment/enrichment.module';
import { QualificationModule } from './qualification/qualification.module';
import { LeadsModule } from './leads/leads.module';
import { CallsModule } from './calls/calls.module';
import { DealsModule } from './deals/deals.module';
import { InvoicesModule } from './invoices/invoices.module';
import { ClientsModule } from './clients/clients.module';
import { WatchdogModule } from './watchdog/watchdog.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AIModule } from './ai/ai.module';

import { WorkersModule } from './workers/workers.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { ObservabilityModule } from './observability/observability.module';
import { OrgModule } from './org/org.module';
import { NotesModule } from './notes/notes.module';
import { TasksModule } from './tasks/tasks.module';
import { TemplatesModule } from './templates/templates.module';
import { SavedViewsModule } from './saved-views/saved-views.module';
import { TagsModule } from './tags/tags.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),

    // Core infrastructure (global providers)
    DatabaseModule,
    SystemLogModule,
    JobsModule,
    EventsModule,

    // Feature modules
    AIModule,
    IntakeModule,
    EnrichmentModule,
    QualificationModule,
    LeadsModule,
    CallsModule,
    DealsModule,
    InvoicesModule,
    ClientsModule,
    WatchdogModule,
    AnalyticsModule,

    // Background processes
    WorkersModule,
    SchedulerModule,

    // Productivity modules
    NotesModule,
    TasksModule,
    TemplatesModule,
    SavedViewsModule,
    TagsModule,

    // Admin/observability
    ObservabilityModule,

    // Org bootstrap
    OrgModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ApiKeyGuard }],
})
export class AppModule {}
