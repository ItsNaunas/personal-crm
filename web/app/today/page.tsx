'use client';

import Link from 'next/link';
import { useActions } from '@/lib/queries/analytics';
import { useTasks } from '@/lib/queries/tasks';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorState } from '@/components/ui/ErrorState';
import { MessageCircle, Users, AlertCircle, Phone, Calendar, Clock, ChevronRight } from 'lucide-react';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const SECTION_IDS = {
  contactedToday: 'contacted-today',
  toContact: 'to-contact',
  followUpOverdue: 'follow-up-overdue',
  followUpDueSoon: 'follow-up-due-soon',
  todaysCalls: 'calls',
  renewals: 'renewals',
  tasks: 'tasks',
} as const;

function BigSectionCard({
  href,
  title,
  count,
  subtitle,
  icon: Icon,
  hasOverdue,
}: {
  href: string;
  title: string;
  count: number;
  subtitle?: string;
  icon: React.ElementType;
  hasOverdue?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group block w-full rounded-2xl border bg-gray-900 p-6 sm:p-8 transition hover:border-gray-600 hover:bg-gray-800/50 ${
        hasOverdue ? 'border-red-900/50' : 'border-gray-800'
      }`}
    >
      <div className="flex items-center gap-5 sm:gap-6">
        <div
          className={`flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl ${
            hasOverdue ? 'bg-red-900/30' : 'bg-gray-800'
          }`}
        >
          <Icon className={`h-7 w-7 sm:h-8 sm:w-8 ${hasOverdue ? 'text-red-400' : 'text-gray-400'}`} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg sm:text-xl font-semibold text-white group-hover:text-brand-400 transition">
            {title}
          </h2>
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="rounded-full bg-gray-800 px-4 py-2 text-lg font-semibold tabular-nums text-white">
            {count}
          </span>
          <ChevronRight className="h-6 w-6 text-gray-500 group-hover:text-brand-400 group-hover:translate-x-0.5 transition" aria-hidden />
        </div>
      </div>
    </Link>
  );
}

export default function TodayPage() {
  const { data, isLoading, isError, error, refetch } = useActions();
  const { data: tasks } = useTasks({ incomplete: true });

  const now = new Date();
  const toFollowUp = data?.toFollowUp ?? [];
  const overdueFollowUps = toFollowUp.filter((l) => l.nextActionDue && new Date(l.nextActionDue) < now);
  const dueSoonFollowUps = toFollowUp.filter((l) => !l.nextActionDue || new Date(l.nextActionDue) >= now);
  const overdueTasks = tasks?.filter((t) => t.dueAt && new Date(t.dueAt) < now && !t.completedAt) ?? [];
  const pendingTaskCount = tasks?.filter((t) => !t.completedAt).length ?? 0;

  const contactedTodayCount = isLoading ? 0 : (data?.contactedTodayCount ?? 0);
  const toContactCount = isLoading ? 0 : (data?.toContact.length ?? 0);
  const todaysCallsCount = isLoading ? 0 : (data?.todaysCalls.length ?? 0);
  const renewalsCount = data?.upcomingRenewals?.length ?? 0;

  return (
    <div>
      <PageHeader
        title={getGreeting()}
        subtitle="Choose a section to see your list. Each card opens a full page."
      />

      <div className="p-6 max-w-4xl">
        {isError && <ErrorState message={(error as Error)?.message} onRetry={() => refetch()} />}

        {!isError && (
          <div className="space-y-4">
            <BigSectionCard
              href={`/today/${SECTION_IDS.contactedToday}`}
              title="Contacted today"
              count={contactedTodayCount}
              subtitle="People you reached out to today"
              icon={MessageCircle}
            />
            <BigSectionCard
              href={`/today/${SECTION_IDS.toContact}`}
              title="To contact"
              count={toContactCount}
              subtitle="New leads waiting for first contact"
              icon={Users}
            />
            <BigSectionCard
              href={`/today/${SECTION_IDS.followUpOverdue}`}
              title="Follow up (overdue)"
              count={overdueFollowUps.length}
              subtitle="Past their follow-up date"
              icon={AlertCircle}
              hasOverdue={overdueFollowUps.length > 0}
            />
            <BigSectionCard
              href={`/today/${SECTION_IDS.followUpDueSoon}`}
              title="Follow up (due soon)"
              count={dueSoonFollowUps.length}
              subtitle="Coming up for follow-up"
              icon={Users}
            />
            <BigSectionCard
              href={`/today/${SECTION_IDS.todaysCalls}`}
              title="Today's calls"
              count={todaysCallsCount}
              subtitle="Scheduled for today"
              icon={Phone}
            />
            <BigSectionCard
              href={`/today/${SECTION_IDS.renewals}`}
              title="Upcoming renewals"
              count={renewalsCount}
              subtitle="Next 30 days"
              icon={Calendar}
            />
            <BigSectionCard
              href={`/today/${SECTION_IDS.tasks}`}
              title="My tasks"
              count={pendingTaskCount}
              subtitle={overdueTasks.length > 0 ? `${overdueTasks.length} overdue` : pendingTaskCount > 0 ? 'Overdue, due today, no due date' : undefined}
              icon={Clock}
              hasOverdue={overdueTasks.length > 0}
            />
          </div>
        )}
      </div>
    </div>
  );
}
