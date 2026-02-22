'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  useLeads,
  useDeleteLead,
  useBulkUpdateLeadStage,
  useBulkUpdateLeadPath,
  useBulkUpdateLeadTemperature,
  useUpdateLeadTemperature,
  useBulkDeleteLeads,
} from '@/lib/queries/leads';
import { useSavedViews, useCreateSavedView, useDeleteSavedView } from '@/lib/queries/saved-views';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  Badge,
  lifecycleStageBadge,
  nextActionBadge,
  priorityBadge,
  temperatureBadge,
  temperatureSelectClasses,
} from '@/components/ui/Badge';
import { TemperatureSelect } from '@/components/ui/TemperatureSelect';
import type { LifecycleStage, Temperature, RecommendedPath, Lead, NextAction, LeadPriority } from '@/types';
import {
  Plus,
  Trash2,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Columns,
  X,
  Search,
} from 'lucide-react';
import { getContactUrl, getContactLabel, getPlatformIcon } from '@/lib/platform-utils';
import { getPathBadgeClass, getPlatformBadgeClass } from '@/lib/path-platform-colors';

const NEXT_ACTION_LABELS: Record<NextAction, string> = {
  contact: 'Contact',
  follow_up: 'Follow up',
  schedule_call: 'Schedule call',
  send_proposal: 'Send proposal',
  no_action: 'No action',
};

/** Labels for priority filter dropdown. */
const PRIORITY_LABELS: Record<LeadPriority, string> = {
  critical: 'Critical',
  high: 'High',
  normal: 'Normal',
  low: 'Low',
};

// ─── Column definitions ──────────────────────────────────────────────────────

const ALL_COLUMNS = [
  { key: 'name', label: 'Name', required: true },
  { key: 'contact', label: 'Contact', required: false },
  { key: 'nextAction', label: 'Next Action', required: false },
  { key: 'priority', label: 'Priority', required: false },
  { key: 'company', label: 'Company', required: false },
  { key: 'phone', label: 'Phone', required: false },
  { key: 'stage', label: 'Stage', required: false },
  { key: 'temperature', label: 'Temperature', required: false },
  { key: 'source', label: 'Lead Source', required: false },
  { key: 'platform', label: 'Platform', required: false },
  { key: 'industry', label: 'Industry', required: false },
  { key: 'location', label: 'Location', required: false },
  { key: 'recommendedPath', label: 'Rec. Path', required: false },
  { key: 'icpScore', label: 'ICP Score', required: false },
  { key: 'ghostRisk', label: 'Ghost Risk', required: false },
  { key: 'buyingSignal', label: 'Buy. Signal', required: false },
  { key: 'dealCount', label: 'Deals', required: false },
  { key: 'domain', label: 'Domain', required: false },
  { key: 'profileLink', label: 'Profile', required: false },
  { key: 'lastStateChange', label: 'Last Activity', required: false },
  { key: 'updatedAt', label: 'Updated', required: false },
  { key: 'createdAt', label: 'Created', required: false },
  { key: 'actions', label: '', required: true },
] as const;

type ColumnKey = (typeof ALL_COLUMNS)[number]['key'];

const DEFAULT_VISIBLE: ColumnKey[] = [
  'name', 'contact', 'profileLink', 'nextAction', 'priority', 'company', 'stage', 'temperature', 'source',
  'icpScore', 'ghostRisk', 'recommendedPath', 'lastStateChange', 'createdAt', 'actions',
];

const STORAGE_KEY = 'crm-leads-columns-v2';

function loadVisibleCols(): ColumnKey[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ColumnKey[];
  } catch { /* ignore */ }
  return DEFAULT_VISIBLE;
}

// ─── Enums ────────────────────────────────────────────────────────────────────

const TEMPERATURES: Temperature[] = ['cold', 'warm', 'hot'];
const LIFECYCLE_STAGES: LifecycleStage[] = [
  'new_lead', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost',
];
const RECOMMENDED_PATHS: RecommendedPath[] = ['outreach', 'nurture', 'direct_call', 'ignore'];

// ─── Sort helpers ─────────────────────────────────────────────────────────────

type SortField = 'name' | 'company' | 'stage' | 'temperature' | 'icpScore' | 'ghostRisk' | 'buyingSignal' | 'lastStateChange' | 'updatedAt' | 'createdAt' | 'source';

function sortLeads(leads: Lead[], field: SortField, dir: 'asc' | 'desc'): Lead[] {
  const factor = dir === 'asc' ? 1 : -1;
  return [...leads].sort((a, b) => {
    let av: string | number | null = null;
    let bv: string | number | null = null;
    switch (field) {
      case 'name': av = a.name; bv = b.name; break;
      case 'company': av = a.companyName ?? ''; bv = b.companyName ?? ''; break;
      case 'stage': av = a.lifecycleStage; bv = b.lifecycleStage; break;
      case 'temperature': av = a.temperature ?? ''; bv = b.temperature ?? ''; break;
      case 'icpScore': av = a.qualificationScore ?? a.icpScore ?? -1; bv = b.qualificationScore ?? b.icpScore ?? -1; break;
      case 'ghostRisk': av = a.ghostRiskScore ?? -1; bv = b.ghostRiskScore ?? -1; break;
      case 'buyingSignal': av = a.buyingSignalScore ?? -1; bv = b.buyingSignalScore ?? -1; break;
      case 'lastStateChange': av = a.lastStateChange ?? ''; bv = b.lastStateChange ?? ''; break;
      case 'updatedAt': av = a.updatedAt; bv = b.updatedAt; break;
      case 'createdAt': av = a.createdAt; bv = b.createdAt; break;
      case 'source': av = a.leadSource ?? ''; bv = b.leadSource ?? ''; break;
    }
    if (av === bv) return 0;
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * factor;
    return String(av).localeCompare(String(bv)) * factor;
  });
}

// ─── CSV export ───────────────────────────────────────────────────────────────

function exportCsv(leads: Lead[]) {
  const headers = ['Name', 'Email', 'Phone', 'Company', 'Stage', 'Temperature', 'Source', 'Industry', 'Location', 'ICP Score', 'Ghost Risk', 'Recommended Path', 'Created'];
  const rows = leads.map((l) => [
    l.name, l.email ?? '', l.phone ?? '', l.companyName ?? '',
    l.lifecycleStage, l.temperature ?? '', l.leadSource ?? '',
    l.industry ?? '', l.location ?? '',
    l.qualificationScore ?? l.icpScore ?? '',
    l.ghostRiskScore ?? '',
    l.recommendedPath ?? '',
    new Date(l.createdAt).toLocaleDateString(),
  ]);
  const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'leads.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LeadsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const lifecycleStage = (searchParams.get('lifecycleStage') as LifecycleStage) || '';
  const temperature = (searchParams.get('temperature') as Temperature) || '';
  const priority = (searchParams.get('priority') as LeadPriority) || '';
  const nextAction = (searchParams.get('nextAction') as NextAction) || '';
  const recommendedPath = (searchParams.get('recommendedPath') as RecommendedPath) || '';
  const platform = searchParams.get('platform') || '';
  const leadSource = searchParams.get('leadSource') || '';

  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');
  const [q, setQ] = useState(searchParams.get('q') || '');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [visibleCols, setVisibleCols] = useState<ColumnKey[]>(DEFAULT_VISIBLE);
  const [colPickerOpen, setColPickerOpen] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStage, setBulkStage] = useState<LifecycleStage | ''>('');
  const [bulkPath, setBulkPath] = useState<RecommendedPath | ''>('');
  const [bulkTemperature, setBulkTemperature] = useState<Temperature | ''>('');

  const bulkUpdateStage = useBulkUpdateLeadStage();
  const bulkUpdatePath = useBulkUpdateLeadPath();
  const bulkUpdateTemperature = useBulkUpdateLeadTemperature();
  const updateTemperature = useUpdateLeadTemperature();
  const bulkDelete = useBulkDeleteLeads();
  const { data: savedViews } = useSavedViews('lead');
  const createSavedView = useCreateSavedView();
  const deleteSavedView = useDeleteSavedView();
  const [saveViewName, setSaveViewName] = useState('');
  const [saveViewOpen, setSaveViewOpen] = useState(false);

  useEffect(() => {
    setVisibleCols(loadVisibleCols());
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') sessionStorage.setItem('leads-list-query', searchParams.toString());
  }, [searchParams]);

  function saveVisibleCols(cols: ColumnKey[]) {
    setVisibleCols(cols);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cols));
  }

  function toggleCol(key: ColumnKey) {
    const col = ALL_COLUMNS.find((c) => c.key === key);
    if (col?.required) return;
    saveVisibleCols(
      visibleCols.includes(key) ? visibleCols.filter((c) => c !== key) : [...visibleCols, key],
    );
  }

  function setFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/leads?${params.toString()}`);
  }

  function handleSearchChange(val: string) {
    setSearchInput(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setQ(val);
      const params = new URLSearchParams(searchParams.toString());
      if (val) params.set('q', val);
      else params.delete('q');
      router.push(`/leads?${params.toString()}`);
    }, 350);
  }

  const { data: rawLeads, isLoading, isError, error, refetch } = useLeads({
    lifecycleStage: lifecycleStage || undefined,
    temperature: temperature || undefined,
    priority: priority || undefined,
    nextAction: nextAction || undefined,
    recommendedPath: recommendedPath || undefined,
    platform: platform || undefined,
    leadSource: leadSource || undefined,
    q: q || undefined,
  });
  const deleteLead = useDeleteLead();

  const leads = useMemo(
    () => (rawLeads ? sortLeads(rawLeads, sortField, sortDir) : []),
    [rawLeads, sortField, sortDir],
  );

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('desc'); }
  }

  function toggleSelect(id: string) {
    setSelectedIds((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === leads.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(leads.map((l) => l.id)));
  }

  const clearFilters = useCallback(() => {
    setSearchInput('');
    setQ('');
    router.push('/leads');
  }, [router]);

  const hasFilters = !!(lifecycleStage || temperature || priority || nextAction || recommendedPath || platform || leadSource || q);

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ChevronsUpDown className="inline h-3 w-3 ml-1 text-gray-600" />;
    return sortDir === 'asc'
      ? <ChevronUp className="inline h-3 w-3 ml-1 text-brand-400" />
      : <ChevronDown className="inline h-3 w-3 ml-1 text-brand-400" />;
  }

  function SortHeader({ field, children }: { field: SortField; children: React.ReactNode }) {
    return (
      <th
        className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 cursor-pointer select-none hover:text-gray-300 transition"
        onClick={() => toggleSort(field)}
      >
        {children}<SortIcon field={field} />
      </th>
    );
  }

  const vis = (key: ColumnKey) => visibleCols.includes(key);

  return (
    <div>
      <PageHeader
        title="Leads"
        subtitle="Manage and track your leads pipeline"
        actions={
          <Link
            href="/leads/new"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600 transition"
          >
            <Plus className="h-4 w-4" />
            Add Lead
          </Link>
        }
      />

      <div className="p-6 space-y-4">
        {/* Search + Filters row */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500 pointer-events-none" />
            <input
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search name, email, company…"
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-gray-700 bg-gray-800 text-sm text-gray-200 placeholder-gray-600 focus:border-brand-500 focus:outline-none"
            />
          </div>

          {/* Stage filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Stage</label>
            <select
              value={lifecycleStage}
              onChange={(e) => setFilter('lifecycleStage', e.target.value)}
              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-200 focus:border-brand-500 focus:outline-none"
            >
              <option value="">All stages</option>
              {LIFECYCLE_STAGES.map((s) => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
          </div>

          {/* Temperature filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Temp</label>
            <TemperatureSelect
              value={temperature as Temperature | ''}
              onChange={(v) => setFilter('temperature', v)}
              size="sm"
              placeholder="All"
              className="[&_button]:rounded-lg [&_button]:px-3 [&_button]:py-1.5"
            />
          </div>

          {/* Priority filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Priority</label>
            <select
              value={priority}
              onChange={(e) => setFilter('priority', e.target.value)}
              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-200 focus:border-brand-500 focus:outline-none"
            >
              <option value="">All</option>
              {(Object.keys(PRIORITY_LABELS) as LeadPriority[]).map((p) => (
                <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
              ))}
            </select>
          </div>

          {/* Next Action filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Next action</label>
            <select
              value={nextAction}
              onChange={(e) => setFilter('nextAction', e.target.value)}
              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-200 focus:border-brand-500 focus:outline-none"
            >
              <option value="">All</option>
              {(Object.keys(NEXT_ACTION_LABELS) as NextAction[]).map((a) => (
                <option key={a} value={a}>{NEXT_ACTION_LABELS[a]}</option>
              ))}
            </select>
          </div>

          {/* Recommended Path filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Path</label>
            <select
              value={recommendedPath}
              onChange={(e) => setFilter('recommendedPath', e.target.value)}
              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-200 focus:border-brand-500 focus:outline-none"
            >
              <option value="">All paths</option>
              {RECOMMENDED_PATHS.map((p) => (
                <option key={p} value={p}>{p.replace('_', ' ')}</option>
              ))}
            </select>
          </div>

          {/* Platform filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Platform</label>
            <select
              value={platform}
              onChange={(e) => setFilter('platform', e.target.value)}
              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-200 focus:border-brand-500 focus:outline-none min-w-[120px]"
            >
              <option value="">All</option>
              <option value="linkedin">LinkedIn</option>
              <option value="cold_email">Cold email</option>
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
              <option value="twitter">Twitter</option>
              <option value="phone">Phone</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Lead Source filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Source</label>
            <select
              value={leadSource}
              onChange={(e) => setFilter('leadSource', e.target.value)}
              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-200 focus:border-brand-500 focus:outline-none min-w-[110px]"
            >
              <option value="">All</option>
              <option value="Referral">Referral</option>
              <option value="Event">Event</option>
              <option value="Cold">Cold outreach</option>
              <option value="Content">Content</option>
              <option value="Paid">Paid ad</option>
              <option value="Inbound">Inbound</option>
              <option value="Import">Import</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {hasFilters && (
            <button onClick={clearFilters} className="text-xs text-gray-500 hover:text-gray-300 transition underline">
              Clear filters
            </button>
          )}
          {hasFilters && (
            <button onClick={() => setSaveViewOpen((v) => !v)} className="text-xs text-brand-400 hover:text-brand-300 transition underline">
              Save view
            </button>
          )}
          {saveViewOpen && (
            <div className="flex items-center gap-1.5">
              <input
                value={saveViewName}
                onChange={(e) => setSaveViewName(e.target.value)}
                placeholder="View name…"
                className="rounded-lg bg-gray-800 border border-gray-700 px-2 py-1 text-xs text-gray-200 focus:border-brand-500 focus:outline-none"
              />
              <button
                disabled={!saveViewName.trim()}
                onClick={async () => {
                  await createSavedView.mutateAsync({
                    name: saveViewName.trim(),
                    entityType: 'lead',
                    filters: {
                      lifecycleStage,
                      temperature,
                      priority,
                      nextAction,
                      recommendedPath,
                      platform,
                      leadSource,
                      q,
                    },
                    sort: sortField,
                    order: sortDir,
                  });
                  setSaveViewName('');
                  setSaveViewOpen(false);
                }}
                className="rounded-lg bg-brand-500 px-2 py-1 text-xs text-white hover:bg-brand-600 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          )}

          {/* Saved views */}
          {savedViews && savedViews.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {savedViews.map((v) => (
                <div key={v.id} className="inline-flex items-center gap-1 rounded-full border border-gray-700 px-2 py-0.5 text-xs text-gray-400">
                  <button
                    onClick={() => {
                      const f = v.filters as Record<string, string>;
                      const params = new URLSearchParams();
                      if (f.lifecycleStage) params.set('lifecycleStage', f.lifecycleStage);
                      if (f.temperature) params.set('temperature', f.temperature);
                      if (f.priority) params.set('priority', f.priority);
                      if (f.nextAction) params.set('nextAction', f.nextAction);
                      if (f.recommendedPath) params.set('recommendedPath', f.recommendedPath);
                      if (f.platform) params.set('platform', f.platform);
                      if (f.leadSource) params.set('leadSource', f.leadSource);
                      if (f.q) params.set('q', f.q);
                      router.push(`/leads?${params.toString()}`);
                    }}
                    className="hover:text-brand-400 transition"
                  >
                    {v.name}
                  </button>
                  <button
                    onClick={() => deleteSavedView.mutate(v.id)}
                    className="text-gray-600 hover:text-red-400 transition ml-0.5"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Column picker */}
          <div className="relative ml-auto">
            <button
              onClick={() => setColPickerOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-800 transition"
            >
              <Columns className="h-3.5 w-3.5" /> Columns
            </button>
            {colPickerOpen && (
              <div className="absolute right-0 top-9 z-20 w-52 rounded-xl border border-gray-700 bg-gray-900 p-3 shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-400">Visible columns</span>
                  <button onClick={() => setColPickerOpen(false)} className="text-gray-600 hover:text-gray-400">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {ALL_COLUMNS.filter((c) => c.key !== 'actions').map((col) => (
                    <label key={col.key} className="flex items-center gap-2 cursor-pointer py-0.5">
                      <input
                        type="checkbox"
                        checked={visibleCols.includes(col.key)}
                        disabled={col.required}
                        onChange={() => toggleCol(col.key)}
                        className="accent-brand-500"
                      />
                      <span className="text-xs text-gray-300">{col.label}</span>
                      {col.required && <span className="text-xs text-gray-600">(required)</span>}
                    </label>
                  ))}
                </div>
                <button
                  onClick={() => saveVisibleCols(DEFAULT_VISIBLE)}
                  className="mt-2 text-xs text-gray-500 hover:text-gray-300 underline"
                >
                  Reset to default
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bulk action toolbar */}
        {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-700 bg-gray-800/60 px-4 py-2.5">
            <span className="text-xs text-gray-400">{selectedIds.size} selected</span>
            <div className="flex items-center gap-2">
              <select
                value={bulkStage}
                onChange={(e) => setBulkStage(e.target.value as LifecycleStage)}
                className="rounded border border-gray-600 bg-gray-700 px-2 py-1 text-xs text-gray-200"
              >
                <option value="">Change stage…</option>
                {LIFECYCLE_STAGES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={bulkPath}
                onChange={(e) => setBulkPath(e.target.value as RecommendedPath)}
                className="rounded border border-gray-600 bg-gray-700 px-2 py-1 text-xs text-gray-200"
              >
                <option value="">Set path…</option>
                {RECOMMENDED_PATHS.map((p) => <option key={p} value={p}>{p.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <TemperatureSelect
                value={bulkTemperature}
                onChange={setBulkTemperature}
                placeholder="Set temperature…"
                className="min-w-[120px]"
              />
            </div>
            {(bulkStage || bulkPath || bulkTemperature) && (
              <button
                disabled={bulkUpdateStage.isPending || bulkUpdatePath.isPending || bulkUpdateTemperature.isPending}
                onClick={async () => {
                  const ids = [...selectedIds];
                  const promises: Promise<unknown>[] = [];
                  if (bulkStage) promises.push(bulkUpdateStage.mutateAsync({ leadIds: ids, stage: bulkStage as LifecycleStage }));
                  if (bulkPath) promises.push(bulkUpdatePath.mutateAsync({ leadIds: ids, recommendedPath: bulkPath as RecommendedPath }));
                  if (bulkTemperature) promises.push(bulkUpdateTemperature.mutateAsync({ leadIds: ids, temperature: bulkTemperature as Temperature }));
                  await Promise.all(promises);
                  setBulkStage('');
                  setBulkPath('');
                  setBulkTemperature('');
                  setSelectedIds(new Set());
                }}
                className="rounded px-3 py-1 text-xs font-medium bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50"
              >
                Apply all
              </button>
            )}
            <button
              onClick={() => exportCsv(leads.filter((l) => selectedIds.has(l.id)))}
              className="rounded px-2 py-1 text-xs border border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Export CSV
            </button>
            <button
              disabled={bulkDelete.isPending}
              onClick={() => {
                if (window.confirm(`Delete ${selectedIds.size} lead(s)? This cannot be undone.`)) {
                  bulkDelete.mutate([...selectedIds], {
                    onSuccess: () => setSelectedIds(new Set()),
                  });
                }
              }}
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs border border-red-800 text-red-400 hover:bg-red-900/30 disabled:opacity-50 transition"
            >
              <Trash2 className="h-3 w-3" />
              Delete selected
            </button>
            <button onClick={() => setSelectedIds(new Set())} className="text-xs text-gray-500 hover:text-gray-300 underline ml-auto">
              Deselect all
            </button>
          </div>
        )}

        {isLoading && <SkeletonTable rows={6} cols={8} />}
        {isError && <ErrorState message={(error as Error)?.message} onRetry={() => refetch()} />}

        {!isLoading && !isError && (!leads || leads.length === 0) && (
          <EmptyState
            icon="👥"
            title="No leads yet"
            description={
              hasFilters
                ? 'No leads match your current filters. Try clearing them.'
                : 'Add your first lead to start managing your pipeline.'
            }
            action={{
              label: hasFilters ? 'Clear filters' : 'Add lead',
              href: hasFilters ? '/leads' : '/leads/new',
            }}
          />
        )}

        {!isLoading && !isError && leads && leads.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-sm whitespace-nowrap">
              <thead className="border-b border-gray-800 bg-gray-900">
                <tr>
                  <th className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === leads.length && leads.length > 0}
                      onChange={toggleSelectAll}
                      className="accent-brand-500"
                    />
                  </th>
                  {vis('name') && <SortHeader field="name">Name</SortHeader>}
                  {vis('contact') && <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Contact</th>}
                  {vis('nextAction') && <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Next Action</th>}
                  {vis('priority') && <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Priority</th>}
                  {vis('company') && <SortHeader field="company">Company</SortHeader>}
                  {vis('phone') && <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Phone</th>}
                  {vis('stage') && <SortHeader field="stage">Stage</SortHeader>}
                  {vis('temperature') && <SortHeader field="temperature">Temp</SortHeader>}
                  {vis('source') && <SortHeader field="source">Source</SortHeader>}
                  {vis('platform') && <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Platform</th>}
                  {vis('industry') && <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Industry</th>}
                  {vis('location') && <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Location</th>}
                  {vis('recommendedPath') && <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Path</th>}
                  {vis('icpScore') && <SortHeader field="icpScore">ICP</SortHeader>}
                  {vis('ghostRisk') && <SortHeader field="ghostRisk">Ghost Risk</SortHeader>}
                  {vis('buyingSignal') && <SortHeader field="buyingSignal">Buy. Signal</SortHeader>}
                  {vis('dealCount') && <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Deals</th>}
                  {vis('domain') && <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Domain</th>}
                  {vis('profileLink') && <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Profile</th>}
                  {vis('lastStateChange') && <SortHeader field="lastStateChange">Last Activity</SortHeader>}
                  {vis('updatedAt') && <SortHeader field="updatedAt">Updated</SortHeader>}
                  {vis('createdAt') && <SortHeader field="createdAt">Created</SortHeader>}
                  <th className="w-14 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 bg-gray-900/40">
                {leads.map((lead) => {
                  const stageMeta = lifecycleStageBadge(lead.lifecycleStage);
                  const tempMeta = lead.temperature ? temperatureBadge(lead.temperature) : null;
                  const score = lead.qualificationScore ?? lead.icpScore;
                  const ghostRisk = lead.ghostRiskScore ?? 0;
                  const isSelected = selectedIds.has(lead.id);

                  return (
                    <tr
                      key={lead.id}
                      className={`hover:bg-gray-800/50 transition ${isSelected ? 'bg-brand-500/5' : ''}`}
                    >
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(lead.id)}
                          className="accent-brand-500"
                        />
                      </td>
                      {vis('name') && (
                        <td
                          className="px-4 py-3 cursor-pointer"
                          onClick={() => router.push(`/leads/${lead.id}`)}
                        >
                          <p className="font-medium text-white">{lead.name}</p>
                          {lead.email && <p className="text-xs text-gray-500">{lead.email}</p>}
                        </td>
                      )}
                      {vis('contact') && (
                        <td className="px-4 py-3">
                          {(() => {
                            const url = getContactUrl(lead.platform, lead.profileLink, lead.email);
                            const label = getContactLabel(lead.platform, lead.profileLink, lead.email);
                            return url ? (
                              <a
                                href={url}
                                target={url.startsWith('mailto') ? undefined : '_blank'}
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-green-900/40 text-green-400 hover:bg-green-900/70 transition"
                              >
                                {getPlatformIcon(lead.platform)} {label}
                              </a>
                            ) : <span className="text-gray-600">—</span>;
                          })()}
                        </td>
                      )}
                      {vis('nextAction') && (
                        <td className="px-4 py-3 cursor-pointer" onClick={() => router.push(`/leads/${lead.id}`)}>
                          {lead.nextAction ? (
                            <Badge
                              label={nextActionBadge(lead.nextAction).label}
                              variant={nextActionBadge(lead.nextAction).variant}
                            />
                          ) : (
                            <span className="text-xs text-gray-600">—</span>
                          )}
                        </td>
                      )}
                      {vis('priority') && (
                        <td className="px-4 py-3 cursor-pointer" onClick={() => router.push(`/leads/${lead.id}`)}>
                          {lead.priority ? (
                            <Badge
                              label={priorityBadge(lead.priority).label}
                              variant={priorityBadge(lead.priority).variant}
                            />
                          ) : <span className="text-gray-600">—</span>}
                        </td>
                      )}
                      {vis('company') && (
                        <td className="px-4 py-3 text-gray-400 cursor-pointer" onClick={() => router.push(`/leads/${lead.id}`)}>
                          {lead.companyName ?? <span className="text-gray-600">—</span>}
                        </td>
                      )}
                      {vis('phone') && (
                        <td className="px-4 py-3 text-gray-400 cursor-pointer" onClick={() => router.push(`/leads/${lead.id}`)}>
                          {lead.phone ?? <span className="text-gray-600">—</span>}
                        </td>
                      )}
                      {vis('stage') && (
                        <td className="px-4 py-3 cursor-pointer" onClick={() => router.push(`/leads/${lead.id}`)}>
                          <Badge label={stageMeta.label} variant={stageMeta.variant} />
                        </td>
                      )}
                      {vis('temperature') && (
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <TemperatureSelect
                            value={(lead.temperature ?? '') as Temperature | ''}
                            onChange={(val) => updateTemperature.mutate({ id: lead.id, temperature: val || null })}
                            disabled={updateTemperature.isPending}
                          />
                        </td>
                      )}
                      {vis('source') && (
                        <td className="px-4 py-3 text-xs text-gray-400 cursor-pointer" onClick={() => router.push(`/leads/${lead.id}`)}>
                          {lead.leadSource ?? <span className="text-gray-600">—</span>}
                        </td>
                      )}
                      {vis('platform') && (
                        <td className="px-4 py-3 cursor-pointer" onClick={() => router.push(`/leads/${lead.id}`)}>
                          {lead.platform
                            ? <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getPlatformBadgeClass(lead.platform)}`}>{lead.platform}</span>
                            : <span className="text-gray-600">—</span>}
                        </td>
                      )}
                      {vis('industry') && (
                        <td className="px-4 py-3 text-xs text-gray-400 cursor-pointer" onClick={() => router.push(`/leads/${lead.id}`)}>
                          {lead.industry ?? <span className="text-gray-600">—</span>}
                        </td>
                      )}
                      {vis('location') && (
                        <td className="px-4 py-3 text-xs text-gray-400 cursor-pointer" onClick={() => router.push(`/leads/${lead.id}`)}>
                          {lead.location ?? <span className="text-gray-600">—</span>}
                        </td>
                      )}
                      {vis('recommendedPath') && (
                        <td className="px-4 py-3 cursor-pointer" onClick={() => router.push(`/leads/${lead.id}`)}>
                          {lead.recommendedPath
                            ? <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getPathBadgeClass(lead.recommendedPath)}`}>{lead.recommendedPath.replace('_', ' ')}</span>
                            : <span className="text-gray-600">—</span>}
                        </td>
                      )}
                      {vis('icpScore') && (
                        <td className="px-4 py-3 text-gray-400 cursor-pointer" onClick={() => router.push(`/leads/${lead.id}`)}>
                          {score != null ? (
                            <span className={`font-medium ${score >= 70 ? 'text-green-400' : score >= 40 ? 'text-yellow-400' : 'text-gray-400'}`}>
                              {Math.round(score)}
                            </span>
                          ) : <span className="text-gray-600">—</span>}
                        </td>
                      )}
                      {vis('ghostRisk') && (
                        <td className="px-4 py-3 cursor-pointer" onClick={() => router.push(`/leads/${lead.id}`)}>
                          {lead.ghostRiskScore != null ? (
                            <span className={`font-medium ${ghostRisk >= 60 ? 'text-red-400' : ghostRisk >= 30 ? 'text-yellow-400' : 'text-gray-400'}`}>
                              {Math.round(ghostRisk)}
                            </span>
                          ) : <span className="text-gray-600">—</span>}
                        </td>
                      )}
                      {vis('buyingSignal') && (
                        <td className="px-4 py-3 cursor-pointer" onClick={() => router.push(`/leads/${lead.id}`)}>
                          {lead.buyingSignalScore != null ? (
                            <span className={`font-medium ${lead.buyingSignalScore >= 75 ? 'text-green-400' : 'text-gray-400'}`}>
                              {Math.round(lead.buyingSignalScore)}
                            </span>
                          ) : <span className="text-gray-600">—</span>}
                        </td>
                      )}
                      {vis('dealCount') && (
                        <td className="px-4 py-3 text-gray-400 cursor-pointer" onClick={() => router.push(`/leads/${lead.id}`)}>
                          {lead._count?.deals ?? 0}
                        </td>
                      )}
                      {vis('domain') && (
                        <td className="px-4 py-3 text-xs text-gray-400 cursor-pointer" onClick={() => router.push(`/leads/${lead.id}`)}>
                          {lead.domain ?? <span className="text-gray-600">—</span>}
                        </td>
                      )}
                      {vis('profileLink') && (
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          {lead.profileLink ? (
                            <a
                              href={lead.profileLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={lead.profileLink}
                              className="inline-flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 hover:underline transition max-w-[140px] truncate"
                            >
                              <ExternalLink className="h-3 w-3 shrink-0" />
                              <span className="truncate">
                                {(() => {
                                  try {
                                    const u = new URL(lead.profileLink);
                                    const parts = u.pathname.replace(/\/$/, '').split('/').filter(Boolean);
                                    return parts[parts.length - 1] || u.hostname;
                                  } catch {
                                    return lead.profileLink;
                                  }
                                })()}
                              </span>
                            </a>
                          ) : <span className="text-gray-600">—</span>}
                        </td>
                      )}
                      {vis('lastStateChange') && (
                        <td className="px-4 py-3 text-xs text-gray-500 cursor-pointer" onClick={() => router.push(`/leads/${lead.id}`)}>
                          {lead.lastStateChange
                            ? new Date(lead.lastStateChange).toLocaleDateString()
                            : <span className="text-gray-600">—</span>}
                        </td>
                      )}
                      {vis('updatedAt') && (
                        <td className="px-4 py-3 text-xs text-gray-500 cursor-pointer" onClick={() => router.push(`/leads/${lead.id}`)}>
                          {new Date(lead.updatedAt).toLocaleDateString()}
                        </td>
                      )}
                      {vis('createdAt') && (
                        <td className="px-4 py-3 text-xs text-gray-500 cursor-pointer" onClick={() => router.push(`/leads/${lead.id}`)}>
                          {new Date(lead.createdAt).toLocaleDateString()}
                        </td>
                      )}
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete lead "${lead.name}"? This cannot be undone.`)) {
                              deleteLead.mutate(lead.id);
                            }
                          }}
                          disabled={deleteLead.isPending}
                          className="inline-flex items-center rounded p-1.5 text-gray-500 hover:bg-red-900/30 hover:text-red-400 transition disabled:opacity-50"
                          title="Delete lead"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && !isError && leads && leads.length > 0 && (
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>{leads.length} lead{leads.length !== 1 ? 's' : ''}</span>
            <button
              onClick={() => exportCsv(leads)}
              className="text-gray-500 hover:text-gray-300 underline transition"
            >
              Export all as CSV
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
