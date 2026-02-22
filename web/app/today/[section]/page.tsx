'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useActions } from '@/lib/queries/analytics';
import { useTasks } from '@/lib/queries/tasks';
import { useCompleteTask, useDeleteTask, useCreateTask } from '@/lib/queries/tasks';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { getContactUrl, getContactLabel, getPlatformIcon } from '@/lib/platform-utils';
import { MessageCircle, Users, AlertCircle, Phone, Calendar, Clock, Plus, Circle, Trash2, ChevronRight } from 'lucide-react';
import { useState } from 'react';

const SECTIONS = [
  'contacted-today',
  'to-contact',
  'follow-up-overdue',
  'follow-up-due-soon',
  'calls',
  'renewals',
  'tasks',
] as const;

type SectionId = (typeof SECTIONS)[number];

function formatLastContact(lastContactedAt: string | Date | null | undefined | unknown): string {
  if (lastContactedAt == null || lastContactedAt === '') return 'Never contacted';
  if (typeof lastContactedAt !== 'string' && !(lastContactedAt instanceof Date)) return 'Never contacted';
  const date = new Date(lastContactedAt as string | Date);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} wk ago`;
  return date.toLocaleDateString();
}

function TaskList({
  tasks,
  onComplete,
  onDelete,
}: {
  tasks: { id: string; title: string; dueAt?: string | null; entityType?: string | null; entityId?: string | null }[];
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <ul className="space-y-1.5">
      {tasks.map((task) => (
        <li key={task.id} className="flex items-start gap-2 group">
          <button onClick={() => onComplete(task.id)} className="mt-0.5 shrink-0 text-gray-600 hover:text-green-400 transition">
            <Circle className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-300">{task.title}</p>
            {task.entityType && task.entityId && (
              <Link href={`/${task.entityType}s/${task.entityId}`} className="text-xs text-brand-500 hover:text-brand-400">
                {task.entityType} →
              </Link>
            )}
          </div>
          <button onClick={() => onDelete(task.id)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function TodaySectionPage() {
  const params = useParams();
  const section = (params?.section as string) ?? '';
  const { data, isLoading, isError, error, refetch } = useActions();
  const { data: tasks } = useTasks({ incomplete: true });
  const completeTask = useCompleteTask();
  const deleteTask = useDeleteTask();
  const createTask = useCreateTask();
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDue, setNewTaskDue] = useState('');
  const [showTaskForm, setShowTaskForm] = useState(false);

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  const overdueTasks = tasks?.filter((t) => t.dueAt && new Date(t.dueAt) < now && !t.completedAt) ?? [];
  const dueTodayTasks =
    tasks?.filter((t) => {
      if (!t.dueAt || t.completedAt) return false;
      const due = new Date(t.dueAt);
      return due >= startOfToday && due <= endOfToday;
    }) ?? [];
  const upcomingTasks = tasks?.filter((t) => !t.dueAt && !t.completedAt) ?? [];
  const toFollowUp = data?.toFollowUp ?? [];
  const overdueFollowUps = toFollowUp.filter((l) => l.nextActionDue && new Date(l.nextActionDue) < now);
  const dueSoonFollowUps = toFollowUp.filter((l) => !l.nextActionDue || new Date(l.nextActionDue) >= now);

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    await createTask.mutateAsync({ title: newTaskTitle.trim(), dueAt: newTaskDue || undefined });
    setNewTaskTitle('');
    setNewTaskDue('');
    setShowTaskForm(false);
  }

  const titles: Record<string, { title: string; subtitle: string }> = {
    'contacted-today': { title: 'Contacted today', subtitle: 'People you reached out to today' },
    'to-contact': { title: 'To contact', subtitle: 'New leads waiting for first contact' },
    'follow-up-overdue': { title: 'Follow up (overdue)', subtitle: 'Past their follow-up date' },
    'follow-up-due-soon': { title: 'Follow up (due soon)', subtitle: 'Coming up for follow-up' },
    calls: { title: "Today's calls", subtitle: 'Scheduled for today' },
    renewals: { title: 'Upcoming renewals', subtitle: 'Next 30 days' },
    tasks: { title: 'My tasks', subtitle: 'Overdue, due today, and no due date' },
  };

  const meta = titles[section] ?? { title: section, subtitle: '' };

  if (!SECTIONS.includes(section as SectionId)) {
    return (
      <div>
        <PageHeader title="Not found" backHref="/today" backLabel="Today" />
        <div className="p-6">
          <p className="text-gray-500">Unknown section. <Link href="/today" className="text-brand-400 hover:text-brand-300">Back to Today</Link></p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={meta.title} subtitle={meta.subtitle} backHref="/today" backLabel="Today" />

      <div className="p-6">
        {isError && <ErrorState message={(error as Error)?.message} onRetry={() => refetch()} />}

        {!isError && section === 'contacted-today' && (
          <>
            {isLoading ? (
              <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : (data?.contactedTodayCount ?? 0) === 0 ? (
              <p className="text-gray-500 py-8">No contacts yet today. <Link href="/leads" className="text-brand-400 hover:text-brand-300">Go to Leads</Link></p>
            ) : (
              <ul className="space-y-2">
                {(data?.contactedToday ?? []).map((lead) => (
                  <li key={lead.id}>
                    <Link href={`/leads/${lead.id}`} className="flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-900 px-4 py-3 hover:border-gray-700 hover:bg-gray-800/50">
                      <MessageCircle className="h-5 w-5 shrink-0 text-green-500/80" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-white">{lead.name}</p>
                        {lead.companyName && <p className="text-sm text-gray-500">{lead.companyName}</p>}
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-gray-500" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {!isError && section === 'to-contact' && (
          <>
            {isLoading ? (
              <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : (data?.toContact.length ?? 0) === 0 ? (
              <p className="text-gray-500 py-8">No new leads. <Link href="/leads" className="text-brand-400 hover:text-brand-300">Add leads</Link></p>
            ) : (
              <ul className="space-y-2">
                {(data?.toContact ?? []).map((lead) => {
                  const url = getContactUrl(lead.platform, lead.profileLink, lead.email);
                  const label = getContactLabel(lead.platform, lead.profileLink, lead.email);
                  return (
                    <li key={lead.id} className="flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-900 px-4 py-3 hover:border-gray-700 hover:bg-gray-800/50">
                      <div className="min-w-0 flex-1">
                        <Link href={`/leads/${lead.id}`} className="font-medium text-white hover:text-brand-400">{lead.name}</Link>
                        {lead.companyName && <p className="text-sm text-gray-500">{lead.companyName}</p>}
                        <p className="text-xs text-gray-500 mt-0.5">{formatLastContact(lead.lastContactedAt)}</p>
                      </div>
                      {url && (
                        <a href={url} target={url.startsWith('mailto') ? undefined : '_blank'} rel="noopener noreferrer" className="shrink-0 rounded-lg bg-green-900/50 px-3 py-1.5 text-xs font-medium text-green-400 hover:bg-green-900/70">
                          {getPlatformIcon(lead.platform)} {label}
                        </a>
                      )}
                      <ChevronRight className="h-4 w-4 shrink-0 text-gray-500" />
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}

        {!isError && section === 'follow-up-overdue' && (
          <>
            {isLoading ? (
              <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : overdueFollowUps.length === 0 ? (
              <p className="text-gray-500 py-8">No overdue follow-ups. Nice work.</p>
            ) : (
              <ul className="space-y-2">
                {overdueFollowUps.map((lead) => {
                  const url = getContactUrl(lead.platform, lead.profileLink, lead.email);
                  const label = getContactLabel(lead.platform, lead.profileLink, lead.email);
                  return (
                    <li key={lead.id} className="flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-900 px-4 py-3 hover:border-gray-700 hover:bg-gray-800/50 border-l-4 border-l-red-500/50">
                      <div className="min-w-0 flex-1">
                        <Link href={`/leads/${lead.id}`} className="font-medium text-white hover:text-brand-400">{lead.name}</Link>
                        {lead.companyName && <p className="text-sm text-gray-500">{lead.companyName}</p>}
                        <p className="text-xs text-gray-500">Last contact: {formatLastContact(lead.lastContactedAt)}</p>
                      </div>
                      {url && (
                        <a href={url} target={url.startsWith('mailto') ? undefined : '_blank'} rel="noopener noreferrer" className="shrink-0 rounded-lg bg-brand-900/50 px-3 py-1.5 text-xs font-medium text-brand-400 hover:bg-brand-900/70">
                          {getPlatformIcon(lead.platform)} {label}
                        </a>
                      )}
                      <ChevronRight className="h-4 w-4 shrink-0 text-gray-500" />
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}

        {!isError && section === 'follow-up-due-soon' && (
          <>
            {isLoading ? (
              <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : dueSoonFollowUps.length === 0 ? (
              <p className="text-gray-500 py-8">No follow-ups due soon.</p>
            ) : (
              <ul className="space-y-2">
                {dueSoonFollowUps.map((lead) => {
                  const url = getContactUrl(lead.platform, lead.profileLink, lead.email);
                  const label = getContactLabel(lead.platform, lead.profileLink, lead.email);
                  return (
                    <li key={lead.id} className="flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-900 px-4 py-3 hover:border-gray-700 hover:bg-gray-800/50">
                      <div className="min-w-0 flex-1">
                        <Link href={`/leads/${lead.id}`} className="font-medium text-white hover:text-brand-400">{lead.name}</Link>
                        {lead.companyName && <p className="text-sm text-gray-500">{lead.companyName}</p>}
                        <p className="text-xs text-gray-500">Last contact: {formatLastContact(lead.lastContactedAt)}</p>
                      </div>
                      {url && (
                        <a href={url} target={url.startsWith('mailto') ? undefined : '_blank'} rel="noopener noreferrer" className="shrink-0 rounded-lg bg-brand-900/50 px-3 py-1.5 text-xs font-medium text-brand-400 hover:bg-brand-900/70">
                          {getPlatformIcon(lead.platform)} {label}
                        </a>
                      )}
                      <ChevronRight className="h-4 w-4 shrink-0 text-gray-500" />
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}

        {!isError && section === 'calls' && (
          <>
            {isLoading ? (
              <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : (data?.todaysCalls.length ?? 0) === 0 ? (
              <p className="text-gray-500 py-8">No calls scheduled today. <Link href="/calls" className="text-brand-400 hover:text-brand-300">Schedule a call</Link></p>
            ) : (
              <ul className="space-y-2">
                {(data?.todaysCalls ?? []).map((call) => (
                  <li key={call.id}>
                    <Link href={call.lead ? `/leads/${call.lead.id}` : '/calls'} className="flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-900 px-4 py-3 hover:border-gray-700 hover:bg-gray-800/50">
                      <Phone className="h-5 w-5 shrink-0 text-yellow-400" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-white">{call.lead?.name ?? 'Call'}</p>
                        <p className="text-sm text-gray-500">{new Date(call.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-gray-500" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {!isError && section === 'renewals' && (
          <>
            {isLoading ? (
              <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : (data?.upcomingRenewals?.length ?? 0) === 0 ? (
              <p className="text-gray-500 py-8">No renewals in the next 30 days.</p>
            ) : (
              <ul className="space-y-2">
                {(data?.upcomingRenewals ?? []).map((client) => (
                  <li key={client.id}>
                    <Link href={`/clients/${client.id}`} className="flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-900 px-4 py-3 hover:border-gray-700 hover:bg-gray-800/50">
                      <Calendar className="h-5 w-5 shrink-0 text-brand-400" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-white">{client.lead?.name ?? 'Client'}</p>
                        <p className="text-sm text-gray-500">Renews {client.renewalDate ? new Date(client.renewalDate).toLocaleDateString() : '—'}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-gray-500" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {!isError && section === 'tasks' && (
          <div className="space-y-6">
            {showTaskForm && (
              <form onSubmit={handleCreateTask} className="flex gap-2 p-4 rounded-xl border border-gray-800 bg-gray-900">
                <input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Task title…"
                  className="flex-1 rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-brand-500 focus:outline-none"
                />
                <input type="datetime-local" value={newTaskDue} onChange={(e) => setNewTaskDue(e.target.value)} className="rounded-lg bg-gray-800 border border-gray-700 px-2 py-2 text-xs text-gray-400 focus:border-brand-500 focus:outline-none w-40" />
                <button type="submit" disabled={!newTaskTitle.trim()} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">Add</button>
              </form>
            )}
            {!showTaskForm && (
              <button type="button" onClick={() => setShowTaskForm(true)} className="flex items-center gap-2 text-brand-400 hover:text-brand-300 text-sm">
                <Plus className="h-4 w-4" /> New task
              </button>
            )}
            {overdueTasks.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-red-400 mb-2">Overdue</h3>
                <TaskList tasks={overdueTasks} onComplete={(id) => completeTask.mutate(id)} onDelete={(id) => deleteTask.mutate(id)} />
              </div>
            )}
            {dueTodayTasks.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-yellow-400 mb-2">Due today</h3>
                <TaskList tasks={dueTodayTasks} onComplete={(id) => completeTask.mutate(id)} onDelete={(id) => deleteTask.mutate(id)} />
              </div>
            )}
            {upcomingTasks.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">No due date</h3>
                <TaskList tasks={upcomingTasks} onComplete={(id) => completeTask.mutate(id)} onDelete={(id) => deleteTask.mutate(id)} />
              </div>
            )}
            {(!tasks || tasks.filter((t) => !t.completedAt).length === 0) && !showTaskForm && (
              <p className="text-gray-500 py-8">No pending tasks. Use &quot;New task&quot; above to add one.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
