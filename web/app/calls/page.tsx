'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCalls, useBookCall, useCompleteCall, useNoShowCall } from '@/lib/queries/calls';
import { useLeads } from '@/lib/queries/leads';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge, callStatusBadge } from '@/components/ui/Badge';
import type { CallStatus } from '@/types';
import { Plus, CalendarPlus } from 'lucide-react';

function buildGoogleCalendarUrl(title: string, startIso: string) {
  const start = new Date(startIso);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().replace(/-|:|\.\d{3}/g, '');
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${fmt(start)}/${fmt(end)}`;
}

const STATUSES: CallStatus[] = ['booked', 'completed', 'no_show'];

export default function CallsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFilter = (searchParams.get('status') as CallStatus) || '';

  const { data: calls, isLoading, isError, error, refetch } = useCalls(statusFilter || undefined);
  const { data: leads } = useLeads();
  const bookCall = useBookCall();
  const completeCall = useCompleteCall();
  const noShowCall = useNoShowCall();

  const [showBook, setShowBook] = useState(false);
  const [completeTarget, setCompleteTarget] = useState<string | null>(null);
  const [bookForm, setBookForm] = useState({ leadId: '', scheduledAt: '' });
  const [completeForm, setCompleteForm] = useState({ transcript: '', outcome: '' });
  const [bookErrors, setBookErrors] = useState<Record<string, string>>({});
  const [completeErrors, setCompleteErrors] = useState<Record<string, string>>({});

  function setStatusFilter(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set('status', value);
    else params.delete('status');
    router.push(`/calls?${params.toString()}`);
  }

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!bookForm.leadId) errs.leadId = 'Select a lead';
    if (!bookForm.scheduledAt) errs.scheduledAt = 'Select a date/time';
    if (Object.keys(errs).length > 0) { setBookErrors(errs); return; }
    await bookCall.mutateAsync({ leadId: bookForm.leadId, scheduledAt: new Date(bookForm.scheduledAt).toISOString() })
      .then(() => { setShowBook(false); setBookForm({ leadId: '', scheduledAt: '' }); })
      .catch(() => {});
  }

  async function handleComplete(e: React.FormEvent) {
    e.preventDefault();
    if (!completeTarget) return;
    const errs: Record<string, string> = {};
    if (!completeForm.transcript.trim()) errs.transcript = 'Transcript is required';
    if (!completeForm.outcome.trim()) errs.outcome = 'Outcome is required';
    if (Object.keys(errs).length > 0) { setCompleteErrors(errs); return; }
    await completeCall.mutateAsync({ id: completeTarget, dto: { transcript: completeForm.transcript, outcome: completeForm.outcome } })
      .then(() => { setCompleteTarget(null); setCompleteForm({ transcript: '', outcome: '' }); })
      .catch(() => {});
  }

  const inputCls = 'w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 focus:border-brand-500 focus:outline-none';
  const labelCls = 'block text-xs text-gray-400 mb-1';

  return (
    <div>
      <PageHeader
        title="Calls"
        subtitle="Schedule and track calls with leads"
        actions={
          <button
            onClick={() => setShowBook(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600 transition"
          >
            <Plus className="h-4 w-4" />
            Book Call
          </button>
        }
      />

      <div className="p-6 space-y-5">
        {/* Filter */}
        <div className="flex items-center gap-3">
          <label className="text-xs text-gray-500">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-200 focus:border-brand-500 focus:outline-none"
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
          {statusFilter && (
            <button onClick={() => setStatusFilter('')} className="text-xs text-gray-500 hover:text-gray-300 underline">
              Clear
            </button>
          )}
        </div>

        {/* Book Call form */}
        {showBook && (
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 max-w-md">
            <h3 className="text-sm font-semibold text-gray-300 mb-4">Book a Call</h3>
            <form onSubmit={handleBook} className="space-y-3">
              <div>
                <label className={labelCls}>Lead *</label>
                <select
                  value={bookForm.leadId}
                  onChange={(e) => setBookForm((f) => ({ ...f, leadId: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">Select a lead…</option>
                  {leads?.data.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
                {bookErrors.leadId && <p className="mt-1 text-xs text-red-400">{bookErrors.leadId}</p>}
              </div>
              <div>
                <label className={labelCls}>Scheduled At *</label>
                <input
                  type="datetime-local"
                  value={bookForm.scheduledAt}
                  onChange={(e) => setBookForm((f) => ({ ...f, scheduledAt: e.target.value }))}
                  className={inputCls}
                />
                {bookErrors.scheduledAt && <p className="mt-1 text-xs text-red-400">{bookErrors.scheduledAt}</p>}
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={bookCall.isPending} className="rounded-lg bg-brand-500 px-4 py-2 text-sm text-white hover:bg-brand-600 disabled:opacity-50 transition">
                  {bookCall.isPending ? 'Booking…' : 'Book Call'}
                </button>
                <button type="button" onClick={() => setShowBook(false)} className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 transition">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Complete Call form */}
        {completeTarget && (
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 max-w-md">
            <h3 className="text-sm font-semibold text-gray-300 mb-4">Complete Call</h3>
            <form onSubmit={handleComplete} className="space-y-3">
              <div>
                <label className={labelCls}>Transcript *</label>
                <textarea
                  value={completeForm.transcript}
                  onChange={(e) => setCompleteForm((f) => ({ ...f, transcript: e.target.value }))}
                  rows={4}
                  placeholder="Paste or type the call transcript…"
                  className={`${inputCls} resize-none`}
                />
                {completeErrors.transcript && <p className="mt-1 text-xs text-red-400">{completeErrors.transcript}</p>}
              </div>
              <div>
                <label className={labelCls}>Outcome *</label>
                <input
                  value={completeForm.outcome}
                  onChange={(e) => setCompleteForm((f) => ({ ...f, outcome: e.target.value }))}
                  placeholder="positive / negative / follow-up"
                  className={inputCls}
                />
                {completeErrors.outcome && <p className="mt-1 text-xs text-red-400">{completeErrors.outcome}</p>}
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={completeCall.isPending} className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50 transition">
                  {completeCall.isPending ? 'Saving…' : 'Mark Complete'}
                </button>
                <button type="button" onClick={() => setCompleteTarget(null)} className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 transition">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {isLoading && <SkeletonTable rows={5} cols={5} />}
        {isError && <ErrorState message={(error as Error)?.message} onRetry={() => refetch()} />}

        {!isLoading && !isError && (!calls || calls.length === 0) && (
          <EmptyState
            icon="📞"
            title="No calls booked"
            description={statusFilter ? 'No calls match this status filter.' : 'Book your first call to get started.'}
            action={statusFilter ? undefined : { label: 'Book Call', onClick: () => setShowBook(true) }}
          />
        )}

        {!isLoading && !isError && calls && calls.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-gray-800">
            <table className="w-full text-sm">
                  <thead className="border-b border-gray-800 bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Lead</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Scheduled</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Completed</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Outcome</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">AI Summary</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 bg-gray-900/40">
                {calls.map((call) => {
                  const statusMeta = callStatusBadge(call.status);
                  return (
                    <tr key={call.id} className="hover:bg-gray-800/40 transition">
                      <td className="px-4 py-3 text-white">
                        {call.lead?.name ?? call.leadId.slice(0, 8)}
                        {call.lead?.companyName && (
                          <p className="text-xs text-gray-500">{call.lead.companyName}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge label={statusMeta.label} variant={statusMeta.variant} />
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        <div className="flex items-center gap-2">
                          <span>{new Date(call.scheduledAt).toLocaleString()}</span>
                          {call.status === 'booked' && (
                            <a
                              href={buildGoogleCalendarUrl(
                                `Call with ${call.lead?.name ?? 'Lead'}`,
                                call.scheduledAt,
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Add to Google Calendar"
                              className="text-brand-500 hover:text-brand-400 transition"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <CalendarPlus className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {call.completedAt
                          ? new Date(call.completedAt).toLocaleString()
                          : <span className="text-gray-600">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {call.outcome ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px]">
                        {call.aiSummary
                          ? <span title={call.aiSummary}>{call.aiSummary.slice(0, 80)}{call.aiSummary.length > 80 ? '…' : ''}</span>
                          : <span className="text-gray-600">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {call.status === 'booked' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => setCompleteTarget(call.id)}
                              className="rounded px-2 py-1 text-xs bg-green-700/30 text-green-300 hover:bg-green-700/50 transition"
                            >
                              Complete
                            </button>
                            <button
                              onClick={() => noShowCall.mutate(call.id)}
                              disabled={noShowCall.isPending}
                              className="rounded px-2 py-1 text-xs bg-red-700/30 text-red-300 hover:bg-red-700/50 transition"
                            >
                              No Show
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
