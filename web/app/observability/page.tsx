'use client';

import { useState } from 'react';
import {
  usePendingJobs,
  useRunningJobs,
  useFailedJobs,
  useDeadLetterJobs,
  useUpcomingCronTasks,
} from '@/lib/queries/observability';
import { PageHeader } from '@/components/ui/PageHeader';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import type { Job, DeadLetterJob, CronTask } from '@/types';

type Tab = 'pending' | 'running' | 'failed' | 'dead_letter' | 'scheduled';

const TABS: { id: Tab; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'running', label: 'Running' },
  { id: 'failed', label: 'Failed' },
  { id: 'dead_letter', label: 'Dead Letter' },
  { id: 'scheduled', label: 'Scheduled' },
];

function JobTable({
  jobs,
  isLoading,
  isError,
  error,
  refetch,
}: {
  jobs?: (Job | DeadLetterJob)[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
}) {
  if (isLoading) return <SkeletonTable rows={4} cols={5} />;
  if (isError) return <ErrorState message={(error as Error)?.message} onRetry={refetch} />;
  if (!jobs || jobs.length === 0) return <EmptyState icon="✅" title="No jobs in this queue" />;

  return (
    <div className="overflow-auto rounded-xl border border-gray-800">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-800 bg-gray-900">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Job ID</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Type</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Attempts</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Last Error</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Scheduled / Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800 bg-gray-900/40">
          {jobs.map((job) => {
            const j = job as Job & DeadLetterJob;
            return (
              <tr key={j.id} className="hover:bg-gray-800/40 transition">
                <td className="px-4 py-3 font-mono text-xs text-gray-400">{j.id.slice(0, 12)}…</td>
                <td className="px-4 py-3">
                  <Badge label={j.jobType} variant="blue" />
                </td>
                <td className="px-4 py-3 text-gray-400">{j.attempts ?? 0}</td>
                <td className="px-4 py-3 max-w-xs">
                  {j.lastError ? (
                    <span className="text-xs text-red-400 truncate block">{j.lastError}</span>
                  ) : (
                    <span className="text-gray-600 text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {j.scheduledFor
                    ? new Date(j.scheduledFor).toLocaleString()
                    : new Date(j.createdAt).toLocaleString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ScheduledTable({
  tasks,
  isLoading,
  isError,
  error,
  refetch,
}: {
  tasks?: CronTask[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
}) {
  if (isLoading) return <SkeletonTable rows={4} cols={4} />;
  if (isError) return <ErrorState message={(error as Error)?.message} onRetry={refetch} />;
  if (!tasks || tasks.length === 0) return <EmptyState icon="📅" title="No scheduled tasks" />;

  return (
    <div className="overflow-auto rounded-xl border border-gray-800">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-800 bg-gray-900">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Task Type</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Cron</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Next Run</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Last Run</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800 bg-gray-900/40">
          {tasks.map((task) => (
            <tr key={task.id} className="hover:bg-gray-800/40 transition">
              <td className="px-4 py-3">
                <Badge label={task.taskType} variant="purple" />
              </td>
              <td className="px-4 py-3 font-mono text-xs text-gray-400">{task.cronExpression}</td>
              <td className="px-4 py-3">
                <Badge
                  label={task.enabled ? 'Enabled' : 'Disabled'}
                  variant={task.enabled ? 'green' : 'gray'}
                />
              </td>
              <td className="px-4 py-3 text-xs text-gray-400">
                {task.nextRunAt ? new Date(task.nextRunAt).toLocaleString() : '—'}
              </td>
              <td className="px-4 py-3 text-xs text-gray-500">
                {task.lastRunAt ? new Date(task.lastRunAt).toLocaleString() : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ObservabilityPage() {
  const [tab, setTab] = useState<Tab>('pending');

  const pending = usePendingJobs();
  const running = useRunningJobs();
  const failed = useFailedJobs();
  const deadLetter = useDeadLetterJobs();
  const cron = useUpcomingCronTasks();

  const counts: Record<Tab, number | undefined> = {
    pending: pending.data?.length,
    running: running.data?.length,
    failed: failed.data?.length,
    dead_letter: deadLetter.data?.length,
    scheduled: cron.data?.length,
  };

  return (
    <div>
      <PageHeader
        title="Observability"
        subtitle="Monitor jobs, workers and scheduled tasks"
      />

      <div className="p-6 space-y-5">
        {/* Tabs */}
        <div className="flex border-b border-gray-800 gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
                tab === t.id
                  ? 'border-brand-500 text-brand-400'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {t.label}
              {counts[t.id] != null && counts[t.id]! > 0 && (
                <span className="rounded-full bg-gray-800 px-1.5 py-0.5 text-xs text-gray-400">
                  {counts[t.id]}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === 'pending' && (
          <JobTable jobs={pending.data} isLoading={pending.isLoading} isError={pending.isError} error={pending.error} refetch={pending.refetch} />
        )}
        {tab === 'running' && (
          <JobTable jobs={running.data} isLoading={running.isLoading} isError={running.isError} error={running.error} refetch={running.refetch} />
        )}
        {tab === 'failed' && (
          <JobTable jobs={failed.data} isLoading={failed.isLoading} isError={failed.isError} error={failed.error} refetch={failed.refetch} />
        )}
        {tab === 'dead_letter' && (
          <JobTable jobs={deadLetter.data} isLoading={deadLetter.isLoading} isError={deadLetter.isError} error={deadLetter.error} refetch={deadLetter.refetch} />
        )}
        {tab === 'scheduled' && (
          <ScheduledTable tasks={cron.data} isLoading={cron.isLoading} isError={cron.isError} error={cron.error} refetch={cron.refetch} />
        )}
      </div>
    </div>
  );
}
