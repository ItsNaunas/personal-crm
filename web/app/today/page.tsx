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

type PreviewItem = { primary: string; secondary?: string };

function BigSectionCard({
  href,
  title,
  count,
  subtitle,
  icon: Icon,
  hasOverdue,
  previewItems = [],
}: {
  href: string;
  title: string;
  count: number;
  subtitle?: string;
  icon: React.ElementType;
  hasOverdue?: boolean;
  previewItems?: PreviewItem[];
}) {
  return (
    <Link
      href={href}
      className={`group relative flex h-full min-h-[240px] w-full flex-col overflow-hidden rounded-2xl border bg-gray-900/95 shadow-sm transition-all duration-200 hover:shadow-md hover:shadow-black/20 ${
        hasOverdue
          ? 'border-red-900/40 hover:border-red-800/60'
          : 'border-gray-800 hover:border-gray-600'
      }`}
    >
      {/* Top: icon + count */}
      <div className="flex items-start justify-between p-5 pb-2">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors ${
            hasOverdue
              ? 'bg-red-500/15 text-red-400'
              : 'bg-gray-800 text-gray-400 group-hover:bg-brand-500/15 group-hover:text-brand-400'
          }`}
        >
          <Icon className="h-6 w-6" aria-hidden />
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium tabular-nums ${
            hasOverdue
              ? 'bg-red-500/20 text-red-300'
              : 'bg-gray-800 text-gray-400 group-hover:bg-gray-700 group-hover:text-gray-300'
          }`}
        >
          {count}
        </span>
      </div>

      {/* Title + subtitle */}
      <div className="px-5">
        <h2 className="text-lg font-semibold tracking-tight text-white group-hover:text-brand-400 transition-colors">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-0.5 line-clamp-1 text-xs text-gray-500" title={subtitle}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Preview list or empty state */}
      <div className="mt-3 flex min-h-0 flex-1 flex-col px-5">
        {previewItems.length > 0 ? (
          <ul className="space-y-2 overflow-hidden" aria-hidden>
            {previewItems.slice(0, 4).map((item, i) => (
              <li key={i} className="flex min-w-0 items-center gap-2">
                <span className="h-1 w-1 shrink-0 rounded-full bg-gray-600" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-sm text-gray-300" title={item.primary}>
                  {item.primary}
                </span>
                {item.secondary != null && item.secondary !== '' && (
                  <span className="shrink-0 text-xs text-gray-500">{item.secondary}</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-2 text-sm italic text-gray-500">Nothing here yet</p>
        )}
      </div>

      {/* Footer: view link */}
      <div className="mt-auto flex items-center justify-end gap-1 border-t border-gray-800/80 px-5 py-3">
        <span className="text-xs text-gray-500 group-hover:text-brand-400 transition-colors">View</span>
        <ChevronRight className="h-4 w-4 text-gray-500 group-hover:text-brand-400 group-hover:translate-x-0.5 transition-all" aria-hidden />
      </div>
    </Link>
  );
}

function formatCallTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return 'Today';
  const isTomorrow = new Date(now.getTime() + 864e5).toDateString() === d.toDateString();
  if (isTomorrow) return 'Tomorrow';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
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

      <div className="p-6">
        {isError && <ErrorState message={(error as Error)?.message} onRetry={() => refetch()} />}

        {!isError && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 auto-rows-fr sm:gap-6">
            <BigSectionCard
              href={`/today/${SECTION_IDS.contactedToday}`}
              title="Contacted today"
              count={contactedTodayCount}
              subtitle="People you reached out to today"
              icon={MessageCircle}
              previewItems={(data?.contactedToday ?? []).slice(0, 4).map((c) => ({
                primary: c.name,
                secondary: c.companyName ?? undefined,
              }))}
            />
            <BigSectionCard
              href={`/today/${SECTION_IDS.toContact}`}
              title="To contact"
              count={toContactCount}
              subtitle="New leads waiting for first contact"
              icon={Users}
              previewItems={(data?.toContact ?? []).slice(0, 4).map((l) => ({
                primary: l.name,
                secondary: l.companyName ?? undefined,
              }))}
            />
            <BigSectionCard
              href={`/today/${SECTION_IDS.followUpOverdue}`}
              title="Follow up (overdue)"
              count={overdueFollowUps.length}
              subtitle="Past their follow-up date"
              icon={AlertCircle}
              hasOverdue={overdueFollowUps.length > 0}
              previewItems={overdueFollowUps.slice(0, 4).map((l) => ({
                primary: l.name,
                secondary: l.nextActionDue ? formatShortDate(l.nextActionDue) : 'Overdue',
              }))}
            />
            <BigSectionCard
              href={`/today/${SECTION_IDS.followUpDueSoon}`}
              title="Follow up (due soon)"
              count={dueSoonFollowUps.length}
              subtitle="Coming up for follow-up"
              icon={Users}
              previewItems={dueSoonFollowUps.slice(0, 4).map((l) => ({
                primary: l.name,
                secondary: l.nextActionDue ? formatShortDate(l.nextActionDue) : undefined,
              }))}
            />
            <BigSectionCard
              href={`/today/${SECTION_IDS.todaysCalls}`}
              title="Today's calls"
              count={todaysCallsCount}
              subtitle="Scheduled for today"
              icon={Phone}
              previewItems={(data?.todaysCalls ?? []).slice(0, 4).map((c) => ({
                primary: c.lead?.name ?? 'Call',
                secondary: formatCallTime(c.scheduledAt),
              }))}
            />
            <BigSectionCard
              href={`/today/${SECTION_IDS.renewals}`}
              title="Upcoming renewals"
              count={renewalsCount}
              subtitle="Next 30 days"
              icon={Calendar}
              previewItems={(data?.upcomingRenewals ?? []).slice(0, 4).map((r) => ({
                primary: r.lead?.name ?? r.name,
                secondary: r.renewalDate ? formatShortDate(r.renewalDate) : undefined,
              }))}
            />
            <BigSectionCard
              href={`/today/${SECTION_IDS.tasks}`}
              title="My tasks"
              count={pendingTaskCount}
              subtitle={overdueTasks.length > 0 ? `${overdueTasks.length} overdue` : pendingTaskCount > 0 ? 'Overdue, due today, no due date' : undefined}
              icon={Clock}
              hasOverdue={overdueTasks.length > 0}
              previewItems={(tasks ?? []).filter((t) => !t.completedAt).slice(0, 4).map((t) => ({
                primary: t.title,
                secondary: t.dueAt
                  ? new Date(t.dueAt) < now
                    ? 'Overdue'
                    : formatShortDate(t.dueAt)
                  : undefined,
              }))}
            />
          </div>
        )}
      </div>
    </div>
  );
}
