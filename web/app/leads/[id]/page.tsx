'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  useLead, useUpdateLead, useUpdateLeadStage, useDeleteLead, useQualifyLead, useEnrichLead,
  useUpdateLeadNextAction, useUpdateLeadPriority, useUpdateLeadTemperature, useMergeLeads,
  useUpdateLeadRecommendedPath,
  useLeads,
} from '@/lib/queries/leads';
import { useDeals } from '@/lib/queries/deals';
import { useCalls } from '@/lib/queries/calls';
import { ActivityTimeline } from '@/components/ActivityTimeline';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge, lifecycleStageBadge, nextActionBadge, priorityBadge, temperatureBadge } from '@/components/ui/Badge';
import { TemperatureSelect } from '@/components/ui/TemperatureSelect';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { NotesSection } from '@/components/ui/NotesSection';

import { TasksSection } from '@/components/ui/TasksSection';
import { TagsSection } from '@/components/ui/TagsSection';
import type { LifecycleStage, NextAction, LeadPriority, Temperature, RecommendedPath } from '@/types';
import Link from 'next/link';
import { Plus, Trash2, Sparkles, Zap, ExternalLink, Mail, GitMerge, ChevronDown, Phone, Building2, Pencil, X } from 'lucide-react';
import { getContactUrl, getContactLabel, getPlatformIcon } from '@/lib/platform-utils';
import { getPathButtonClasses, getPlatformBadgeClass } from '@/lib/path-platform-colors';
const PRIORITY_COLORS: Record<LeadPriority, string> = {
  critical: 'text-red-400 bg-red-900/30 border-red-800',
  high: 'text-orange-400 bg-orange-900/30 border-orange-800',
  normal: 'text-gray-400 bg-gray-800 border-gray-700',
  low: 'text-gray-500 bg-gray-800/50 border-gray-800',
};
import { trackRecentItem } from '@/components/Sidebar';

const LEADS_LIST_QUERY_KEY = 'leads-list-query';


const STAGES: LifecycleStage[] = [
  'new_lead', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost',
];

const RECOMMENDED_PATHS: Array<RecommendedPath> = ['outreach', 'nurture', 'direct_call', 'ignore'];

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-800 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm text-gray-300">{value ?? '—'}</span>
    </div>
  );
}

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === 'string' ? params.id : undefined;
  const router = useRouter();
  const { data: lead, isLoading, isError, error, refetch } = useLead(id ?? '');
  const updateStage = useUpdateLeadStage();
  const deleteLead = useDeleteLead();
  const qualifyLead = useQualifyLead();
  const enrichLead = useEnrichLead();
  const [stageEdit, setStageEdit] = useState(false);
  const [nextActionEdit, setNextActionEdit] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeSearch, setMergeSearch] = useState('');
  const [actionsOpen, setActionsOpen] = useState(false);
  const [profileEdit, setProfileEdit] = useState(false);
  const [leadsListQuery, setLeadsListQuery] = useState('');

  useEffect(() => {
    setLeadsListQuery(typeof window !== 'undefined' ? sessionStorage.getItem(LEADS_LIST_QUERY_KEY) || '' : '');
  }, []);

  const leadsListHref = `/leads${leadsListQuery ? `?${leadsListQuery}` : ''}`;

  const updateNextAction = useUpdateLeadNextAction();
  const updatePriority = useUpdateLeadPriority();
  const updateTemperature = useUpdateLeadTemperature();
  const updateRecommendedPath = useUpdateLeadRecommendedPath();
  const updateLead = useUpdateLead();
  const mergeLeads = useMergeLeads();
  const { data: allLeads } = useLeads();
  const { data: allDeals } = useDeals();
  const { data: allCalls } = useCalls();

  useEffect(() => {
    if (lead) trackRecentItem({ type: 'lead', id: lead.id, name: lead.name });
  }, [lead?.id]);

  const leadDeals = allDeals?.filter((d) => d.leadId === id) ?? [];
  const leadCalls = allCalls?.filter((c) => c.leadId === id) ?? [];
  const nextCall = leadCalls
    .filter((c) => c.status === 'booked' && new Date(c.scheduledAt) > new Date())
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0];

  if (!id) {
    return (
      <div className="p-6">
        <ErrorState message="Invalid lead ID" onRetry={() => router.push(typeof window !== 'undefined' && sessionStorage.getItem(LEADS_LIST_QUERY_KEY) ? `/leads?${sessionStorage.getItem(LEADS_LIST_QUERY_KEY)}` : '/leads')} />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div>
        <div className="border-b border-gray-800 px-6 py-4">
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="p-6 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <ErrorState message={(error as Error)?.message} onRetry={() => refetch()} />
      </div>
    );
  }

  if (!lead) return null;

  const stageMeta = lifecycleStageBadge(lead.lifecycleStage);
  const tempMeta = lead.temperature ? temperatureBadge(lead.temperature) : null;
  const score = lead.qualificationScore ?? lead.icpScore;

  return (
    <div>
      <PageHeader
        title={lead.name}
        subtitle={lead.companyName ?? lead.email ?? 'Lead detail'}
        backHref={leadsListHref}
        backLabel="Leads"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/deals?leadId=${lead.id}`}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600 transition"
            >
              <Plus className="h-4 w-4" />
              Create Deal
            </Link>
            {(() => {
              const contactUrl = getContactUrl(lead.platform, lead.profileLink, lead.email);
              const contactLabel = getContactLabel(lead.platform, lead.profileLink, lead.email);
              return contactUrl ? (
                <a
                  href={contactUrl}
                  target={contactUrl.startsWith('mailto') ? undefined : '_blank'}
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-green-700 hover:bg-green-600 px-3 py-2 text-sm font-medium text-white transition"
                >
                  {getPlatformIcon(lead.platform)} {contactLabel}
                </a>
              ) : null;
            })()}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActionsOpen((o) => !o)}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-300 hover:border-brand-500 hover:text-brand-400 transition"
              >
                Actions <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {actionsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setActionsOpen(false)} aria-hidden />
                  <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-gray-700 bg-gray-900 py-1 shadow-xl">
                    <button
                      type="button"
                      disabled={qualifyLead.isPending}
                      onClick={() => { qualifyLead.mutate(lead.id); setActionsOpen(false); }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 disabled:opacity-50"
                    >
                      <Sparkles className="h-4 w-4" /> {qualifyLead.isPending ? 'Qualifying…' : 'Qualify'}
                    </button>
                    <button
                      type="button"
                      disabled={enrichLead.isPending}
                      onClick={() => { enrichLead.mutate(lead.id); setActionsOpen(false); }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 disabled:opacity-50"
                    >
                      <Zap className="h-4 w-4" /> {enrichLead.isPending ? 'Enriching…' : 'Enrich'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setMergeOpen(true); setActionsOpen(false); }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-800"
                    >
                      <GitMerge className="h-4 w-4" /> Merge
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActionsOpen(false);
                        if (window.confirm(`Delete lead "${lead.name}"? This cannot be undone.`)) {
                          deleteLead.mutate(lead.id);
                        }
                      }}
                      disabled={deleteLead.isPending}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-400 hover:bg-gray-800 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" /> Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        }
      />

      {/* Quick contact strip */}
      <div className="border-b border-gray-800 bg-gray-900/40 px-6 py-3">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          {lead.email && (
            <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-1.5 text-gray-300 hover:text-brand-400 transition">
              <Mail className="h-3.5 w-3.5 text-gray-500" /> {lead.email}
            </a>
          )}
          {lead.phone && (
            <a href={`tel:${lead.phone}`} className="inline-flex items-center gap-1.5 text-gray-300 hover:text-brand-400 transition">
              <Phone className="h-3.5 w-3.5 text-gray-500" /> {lead.phone}
            </a>
          )}
          {lead.companyName && (
            <span className="inline-flex items-center gap-1.5 text-gray-500">
              <Building2 className="h-3.5 w-3.5" /> {lead.companyName}
            </span>
          )}
          {lead.profileLink && (
            <a href={lead.profileLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-brand-400 hover:text-brand-300 transition">
              <ExternalLink className="h-3.5 w-3.5" /> Profile
            </a>
          )}
          {!lead.email && !lead.phone && !lead.companyName && !lead.profileLink && (
            <span className="text-gray-600 text-xs">No contact info yet</span>
          )}
        </div>
      </div>

      {/* Merge modal */}
      {mergeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
            <h3 className="text-sm font-semibold text-gray-200 mb-3">Merge with another lead</h3>
            <p className="text-xs text-gray-500 mb-4">
              The current lead ({lead.name}) becomes the master. The selected duplicate will be deleted and its data merged in.
            </p>
            <input
              value={mergeSearch}
              onChange={(e) => setMergeSearch(e.target.value)}
              placeholder="Search leads to merge…"
              className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-brand-500 focus:outline-none mb-3"
            />
            <div className="max-h-48 overflow-y-auto space-y-1">
              {allLeads
                ?.data.filter((l) => l.id !== lead.id && (l.name.toLowerCase().includes(mergeSearch.toLowerCase()) || (l.email ?? '').toLowerCase().includes(mergeSearch.toLowerCase())))
                .slice(0, 10)
                .map((l) => (
                  <button
                    key={l.id}
                    onClick={() => {
                      if (window.confirm(`Merge "${l.name}" into "${lead.name}"? "${l.name}" will be deleted.`)) {
                        mergeLeads.mutate({ masterId: lead.id, duplicateId: l.id });
                        setMergeOpen(false);
                        router.push(leadsListHref);
                      }
                    }}
                    className="w-full text-left rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 transition"
                  >
                    {l.name} {l.email ? <span className="text-gray-500 text-xs">({l.email})</span> : null}
                  </button>
                ))}
            </div>
            <button
              onClick={() => setMergeOpen(false)}
              className="mt-4 w-full rounded-lg border border-gray-700 py-2 text-sm text-gray-400 hover:bg-gray-800 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="p-6 grid gap-6 lg:grid-cols-3">
        {/* Left column: Profile first, then what to do, then deals/calls/tags */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile — editable; first so "who is this" is clear */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-300">Profile</h3>
              {!profileEdit ? (
                <button
                  type="button"
                  onClick={() => setProfileEdit(true)}
                  className="inline-flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit profile
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setProfileEdit(false)}
                  className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition"
                >
                  <X className="h-3.5 w-3.5" /> Cancel
                </button>
              )}
            </div>

            {!profileEdit ? (
              <div className="space-y-4">
                <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
                  <InfoRow label="Name" value={lead.name} />
                  <InfoRow label="Email" value={lead.email} />
                  <InfoRow label="Phone" value={lead.phone} />
                  <InfoRow label="Company" value={lead.companyName} />
                  <InfoRow label="Domain" value={lead.domain} />
                  <InfoRow label="Industry" value={lead.industry} />
                  <InfoRow label="Location" value={lead.location} />
                  <InfoRow label="Lead source" value={lead.leadSource} />
                  <div className="flex justify-between py-2 border-b border-gray-800 last:border-0">
                    <span className="text-xs text-gray-500">Platform</span>
                    {lead.platform
                      ? <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getPlatformBadgeClass(lead.platform)}`}>{lead.platform}</span>
                      : <span className="text-sm text-gray-300">—</span>}
                  </div>
                  <InfoRow label="Employee count" value={lead.employeeCount} />
                  <InfoRow label="Revenue band" value={lead.revenueBand} />
                </div>
                {lead.profileLink && (
                  <div className="flex justify-between items-center pt-2 border-t border-gray-800">
                    <span className="text-xs text-gray-500">Profile link</span>
                    <a href={lead.profileLink} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-400 hover:underline inline-flex items-center gap-1">
                      Open <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const get = (k: string) => (fd.get(k) as string)?.trim() || undefined;
                  const emp = fd.get('employeeCount');
                  updateLead.mutate(
                    {
                      id: lead.id,
                      name: get('name') || lead.name,
                      email: get('email') || undefined,
                      phone: get('phone') || undefined,
                      companyName: get('companyName') || undefined,
                      domain: get('domain') || undefined,
                      industry: get('industry') || undefined,
                      location: get('location') || undefined,
                      leadSource: get('leadSource') || undefined,
                      platform: get('platform') || undefined,
                      profileLink: get('profileLink') || undefined,
                      employeeCount: emp !== null && emp !== '' ? Number(emp) : undefined,
                      revenueBand: get('revenueBand') || undefined,
                    },
                    { onSuccess: () => setProfileEdit(false) },
                  );
                }}
                className="space-y-4"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Name</label>
                    <input name="name" defaultValue={lead.name} required className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 focus:border-brand-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Email</label>
                    <input name="email" type="email" defaultValue={lead.email ?? ''} className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 focus:border-brand-500 focus:outline-none" placeholder="Optional" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Phone</label>
                    <input name="phone" defaultValue={lead.phone ?? ''} className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 focus:border-brand-500 focus:outline-none" placeholder="Optional" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Company</label>
                    <input name="companyName" defaultValue={lead.companyName ?? ''} className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 focus:border-brand-500 focus:outline-none" placeholder="Optional" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Domain</label>
                    <input name="domain" defaultValue={lead.domain ?? ''} className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 focus:border-brand-500 focus:outline-none" placeholder="e.g. acme.com" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Industry</label>
                    <input name="industry" defaultValue={lead.industry ?? ''} className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 focus:border-brand-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Location</label>
                    <input name="location" defaultValue={lead.location ?? ''} className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 focus:border-brand-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Lead source</label>
                    <input name="leadSource" defaultValue={lead.leadSource ?? ''} className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 focus:border-brand-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Platform</label>
                    <input name="platform" defaultValue={lead.platform ?? ''} className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 focus:border-brand-500 focus:outline-none" placeholder="e.g. linkedin, cold_email" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Profile link</label>
                    <input name="profileLink" type="url" defaultValue={lead.profileLink ?? ''} className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 focus:border-brand-500 focus:outline-none" placeholder="URL" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Employee count</label>
                    <input name="employeeCount" type="number" min={0} defaultValue={lead.employeeCount ?? ''} className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 focus:border-brand-500 focus:outline-none" placeholder="Optional" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Revenue band</label>
                    <input name="revenueBand" defaultValue={lead.revenueBand ?? ''} className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 focus:border-brand-500 focus:outline-none" placeholder="Optional" />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={updateLead.isPending}
                    className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 transition"
                  >
                    {updateLead.isPending ? 'Saving…' : 'Save changes'}
                  </button>
                  <button type="button" onClick={() => setProfileEdit(false)} className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-400 hover:bg-gray-800 transition">
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Next action + priority */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-300">Next Action</h3>
              <button
                onClick={() => setNextActionEdit((v) => !v)}
                className="text-xs text-brand-400 hover:text-brand-300 transition"
              >
                {nextActionEdit ? 'Done' : 'Edit'}
              </button>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {lead.nextAction ? (
                <Badge
                  label={nextActionBadge(lead.nextAction).label}
                  variant={nextActionBadge(lead.nextAction).variant}
                  className="border border-current/30"
                />
              ) : (
                <span className="text-xs text-gray-600">No next action set</span>
              )}
              {lead.priority && (
                <Badge
                  label={priorityBadge(lead.priority).label}
                  variant={priorityBadge(lead.priority).variant}
                  className="border border-current/30"
                />
              )}
              {lead.nextActionDue && (
                <span className={`text-xs ${new Date(lead.nextActionDue) < new Date() ? 'text-red-400' : 'text-gray-500'}`}>
                  Due: {new Date(lead.nextActionDue).toLocaleDateString()}
                </span>
              )}
            </div>
            {nextActionEdit && (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Next action</label>
                  <div className="flex flex-wrap gap-2">
                    {(['contact', 'follow_up', 'schedule_call', 'send_proposal', 'no_action'] as NextAction[]).map((a) => {
                      const meta = nextActionBadge(a);
                      return (
                        <button
                          key={a}
                          type="button"
                          onClick={() => updateNextAction.mutate({ id: lead.id, nextAction: a })}
                          className={lead.nextAction === a ? '' : 'opacity-70 hover:opacity-100 transition'}
                        >
                          <Badge
                            label={meta.label}
                            variant={lead.nextAction === a ? meta.variant : 'gray'}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Due date</label>
                  <input
                    type="date"
                    value={lead.nextActionDue ? new Date(lead.nextActionDue).toISOString().slice(0, 10) : ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      updateNextAction.mutate({ id: lead.id, nextActionDue: v || null });
                    }}
                    className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-200 focus:border-brand-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => updateNextAction.mutate({ id: lead.id, nextActionDue: null })}
                    className="ml-2 text-xs text-gray-500 hover:text-gray-300"
                  >
                    Clear
                  </button>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Priority</label>
                  <div className="flex flex-wrap gap-2">
                    {(['critical', 'high', 'normal', 'low'] as LeadPriority[]).map((p) => (
                      <button
                        key={p}
                        onClick={() => updatePriority.mutate({ id: lead.id, priority: p })}
                        className={`rounded-full border px-3 py-1 text-xs transition ${lead.priority === p ? 'bg-brand-500 border-brand-500 text-white' : 'border-gray-700 text-gray-400 hover:border-brand-500 hover:text-brand-400'}`}
                      >
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Tags</h3>
            <TagsSection leadId={lead.id} />
          </div>

          {/* Stage update */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-300">Lifecycle Stage</h3>
              <button
                onClick={() => setStageEdit((v) => !v)}
                className="text-xs text-brand-400 hover:text-brand-300 transition"
              >
                {stageEdit ? 'Cancel' : 'Update'}
              </button>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <Badge label={stageMeta.label} variant={stageMeta.variant} />
              {tempMeta && <Badge label={tempMeta.label} variant={tempMeta.variant} />}
              {score != null && (
                <span className="text-xs text-gray-500">ICP: {Math.round(score)}</span>
              )}
              {lead.ghostRiskScore != null && lead.ghostRiskScore > 0 && (
                <span className={`text-xs ${lead.ghostRiskScore >= 60 ? 'text-red-400' : 'text-gray-500'}`}>
                  Ghost risk: {Math.round(lead.ghostRiskScore)}
                </span>
              )}
              {lead.buyingSignalScore != null && lead.buyingSignalScore > 0 && (
                <span className={`text-xs ${lead.buyingSignalScore >= 75 ? 'text-green-400' : 'text-gray-500'}`}>
                  Buying signal: {Math.round(lead.buyingSignalScore)}
                </span>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-500">Path:</span>
                {RECOMMENDED_PATHS.map((path) => (
                  <button
                    key={path}
                    onClick={() => updateRecommendedPath.mutate({ id: lead.id, recommendedPath: path })}
                    disabled={updateRecommendedPath.isPending}
                    className={getPathButtonClasses(path, lead.recommendedPath === path)}
                  >
                    {path.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {stageEdit && (
              <div className="mt-4 flex flex-wrap gap-2">
                {STAGES.map((s) => {
                  const meta = lifecycleStageBadge(s);
                  return (
                    <button
                      key={s}
                      onClick={() => { updateStage.mutate({ id: lead.id, stage: s }); setStageEdit(false); }}
                      disabled={updateStage.isPending || s === lead.lifecycleStage}
                      className="rounded-full border border-gray-700 px-3 py-1 text-xs text-gray-300 hover:border-brand-500 hover:text-brand-400 disabled:opacity-40 transition"
                    >
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Deals & Calls summary */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Deals */}
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-300">Deals</h3>
                <span className="text-xs text-gray-500">{leadDeals.length} total</span>
              </div>
              {leadDeals.length === 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-gray-600">No deals linked to this lead.</p>
                  <Link
                    href={`/deals?leadId=${lead.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500/20 border border-brand-500/40 px-3 py-2 text-xs font-medium text-brand-300 hover:bg-brand-500/30 transition"
                  >
                    <Plus className="h-3.5 w-3.5" /> Create deal
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {leadDeals.slice(0, 3).map((deal) => (
                    <Link
                      key={deal.id}
                      href={`/deals/${deal.id}`}
                      className="flex items-center justify-between rounded-lg bg-gray-800 px-3 py-2 text-xs hover:bg-gray-700 transition"
                    >
                      <span className="text-white">${deal.dealValue.toLocaleString()}</span>
                      <span className="text-gray-400 capitalize">{deal.stage}</span>
                    </Link>
                  ))}
                  {leadDeals.length > 3 && (
                    <Link href={`/deals?leadId=${lead.id}`} className="text-xs text-brand-400 hover:text-brand-300">
                      +{leadDeals.length - 3} more →
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Calls */}
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-300">Calls</h3>
                <span className="text-xs text-gray-500">{leadCalls.length} total</span>
              </div>
              {nextCall && (
                <div className="mb-3 rounded-lg bg-brand-500/10 border border-brand-500/30 px-3 py-2 text-xs">
                  <p className="text-brand-400 font-medium">Next call</p>
                  <p className="text-gray-300">{new Date(nextCall.scheduledAt).toLocaleString()}</p>
                </div>
              )}
              {leadCalls.length === 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-gray-600">No calls yet.</p>
                  <button
                    type="button"
                    onClick={() => router.push(`/calls?leadId=${lead.id}`)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500/20 border border-brand-500/40 px-3 py-2 text-xs font-medium text-brand-300 hover:bg-brand-500/30 transition"
                  >
                    <Plus className="h-3.5 w-3.5" /> Book a call
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  {leadCalls.slice(0, 3).map((call) => (
                    <div key={call.id} className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">{new Date(call.scheduledAt).toLocaleDateString()}</span>
                      <span className={`capitalize ${call.status === 'completed' ? 'text-green-400' : call.status === 'no_show' ? 'text-red-400' : 'text-gray-400'}`}>
                        {call.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={() => router.push(`/calls?leadId=${lead.id}`)}
                className="mt-3 text-xs text-brand-400 hover:text-brand-300 transition"
              >
                Book a call →
              </button>
            </div>
          </div>

          {/* Signals & metadata — scores and temperature (not in profile form) */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Signals & metadata</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 shrink-0">Temperature</span>
                <TemperatureSelect
                  value={(lead.temperature ?? '') as Temperature | ''}
                  onChange={(val) => updateTemperature.mutate({ id: lead.id, temperature: val || null })}
                  disabled={updateTemperature.isPending}
                  size="sm"
                  placeholder="— Not set"
                />
              </div>
              {score != null && (
                <div className="flex justify-between py-1 border-b border-gray-800">
                  <span className="text-xs text-gray-500">ICP score</span>
                  <span className="text-sm text-gray-300">{Math.round(score)}</span>
                </div>
              )}
              {lead.ghostRiskScore != null && lead.ghostRiskScore > 0 && (
                <div className="flex justify-between py-1 border-b border-gray-800">
                  <span className="text-xs text-gray-500">Ghost risk</span>
                  <span className={`text-sm ${lead.ghostRiskScore >= 60 ? 'text-red-400' : 'text-gray-400'}`}>{Math.round(lead.ghostRiskScore)}</span>
                </div>
              )}
              {lead.buyingSignalScore != null && lead.buyingSignalScore > 0 && (
                <div className="flex justify-between py-1 border-b border-gray-800">
                  <span className="text-xs text-gray-500">Buying signal</span>
                  <span className={`text-sm ${lead.buyingSignalScore >= 75 ? 'text-green-400' : 'text-gray-400'}`}>{Math.round(lead.buyingSignalScore)}</span>
                </div>
              )}
              {lead.estimatedMonthlyRevenueLeak != null && lead.estimatedMonthlyRevenueLeak > 0 && (
                <div className="flex justify-between py-1 border-b border-gray-800 sm:col-span-2">
                  <span className="text-xs text-gray-500">Est. revenue leak</span>
                  <span className="text-sm text-gray-400">${lead.estimatedMonthlyRevenueLeak.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-gray-800 text-xs text-gray-500 sm:col-span-2">
                <span>Created</span>
                <span>{new Date(lead.createdAt).toLocaleDateString()}</span>
              </div>
              {lead.lastStateChange && (
                <div className="flex justify-between py-1 border-b border-gray-800 text-xs text-gray-500 sm:col-span-2">
                  <span>Last activity</span>
                  <span>{new Date(lead.lastStateChange as string).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Timeline + Notes + Tasks */}
        <div className="space-y-6">
          <ActivityTimeline entityType="lead" entityId={lead.id} />
          <NotesSection entityType="lead" entityId={lead.id} />
          <TasksSection entityType="lead" entityId={lead.id} />
        </div>
      </div>
    </div>
  );
}
