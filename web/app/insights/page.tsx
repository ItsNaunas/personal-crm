'use client';

import Link from 'next/link';
import { useDashboard, useRevenueBySource } from '@/lib/queries/analytics';
import { useDeals } from '@/lib/queries/deals';
import { useLeads } from '@/lib/queries/leads';
import { PageHeader } from '@/components/ui/PageHeader';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { Badge, dealStageBadge } from '@/components/ui/Badge';
import { ArrowRight } from 'lucide-react';

export default function InsightsPage() {
  const dashboard = useDashboard();
  const { data: deals } = useDeals();
  const { data: leads } = useLeads();
  const { data: revenueBySource } = useRevenueBySource();

  // Stuck deals: sort active deals by oldest stageLastChangedAt or createdAt
  const stuckDeals = deals?.filter(
    (d) => d.stage !== 'won' && d.stage !== 'lost',
  ).sort((a, b) => {
    const aDate = new Date(a.stageLastChangedAt ?? a.createdAt).getTime();
    const bDate = new Date(b.stageLastChangedAt ?? b.createdAt).getTime();
    return aDate - bDate;
  }).slice(0, 5) ?? [];

  // High ghost-risk leads — use ghostRiskScore (the correct field)
  const ghostRiskLeads = leads
    ?.filter((l) => l.ghostRiskScore != null && l.ghostRiskScore > 30)
    .sort((a, b) => (b.ghostRiskScore ?? 0) - (a.ghostRiskScore ?? 0))
    .slice(0, 5) ?? [];

  const lostPipeline = deals
    ?.filter((d) => d.stage === 'lost')
    .reduce((s, d) => s + d.dealValue * (d.probability ?? 0.5), 0) ?? 0;

  return (
    <div>
      <PageHeader
        title="Insights"
        subtitle="Opportunity cost, stuck deals, and risk signals"
      />

      <div className="p-6 space-y-8">
        {dashboard.isError && (
          <ErrorState message={(dashboard.error as Error)?.message} onRetry={() => dashboard.refetch()} />
        )}

        {/* Opportunity cost */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
            Opportunity Cost
          </h2>
          {dashboard.isLoading ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
                <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Est. Lost Revenue</p>
                <p className="text-2xl font-bold text-red-400">
                  ${Math.round(lostPipeline).toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-gray-500">from {deals?.filter((d) => d.stage === 'lost').length ?? 0} lost deals</p>
              </div>
              <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
                <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Active Pipeline</p>
                <p className="text-2xl font-bold text-white">
                  ${(dashboard.data?.pipeline?.totalPipeline ?? 0).toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-gray-500">{dashboard.data?.pipeline?.dealCount ?? 0} open deals</p>
              </div>
              <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
                <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Conversion Rate</p>
                <p className="text-2xl font-bold text-white">
                  {dashboard.data?.velocity?.conversionRatePercent ?? 0}%
                </p>
                <p className="mt-1 text-xs text-gray-500">won vs total deals</p>
              </div>
            </div>
          )}
        </section>

        {/* Stuck deals */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
              Oldest Active Deals
            </h2>
            <Link href="/deals" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
              All deals <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {stuckDeals.length === 0 ? (
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 text-center text-sm text-gray-500">
              No active deals yet.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-800">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-800 bg-gray-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Lead</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Stage</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Value</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Created</th>
                    <th className="w-8 px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800 bg-gray-900/40">
                  {stuckDeals.map((deal) => {
                    const stageMeta = dealStageBadge(deal.stage);
                    return (
                      <tr key={deal.id} className="hover:bg-gray-800/40 transition">
                        <td className="px-4 py-3 text-white">{deal.lead?.name ?? deal.leadId.slice(0, 8)}</td>
                        <td className="px-4 py-3"><Badge label={stageMeta.label} variant={stageMeta.variant} /></td>
                        <td className="px-4 py-3 text-gray-400">${deal.dealValue.toLocaleString()}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(deal.stageLastChangedAt ?? deal.createdAt).toLocaleDateString()}
                    </td>
                        <td className="px-4 py-3">
                          <Link href={`/deals/${deal.id}`} className="text-brand-400 hover:text-brand-300">
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Ghost risk leads */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
              High Ghost Risk Leads
            </h2>
            <Link href="/leads" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
              All leads <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {ghostRiskLeads.length === 0 ? (
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 text-center text-sm text-gray-500">
              No high ghost-risk leads detected.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-800">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-800 bg-gray-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Company</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Ghost Risk</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Last Change</th>
                    <th className="w-8 px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800 bg-gray-900/40">
                  {ghostRiskLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-800/40 transition">
                      <td className="px-4 py-3 text-white">{lead.name}</td>
                      <td className="px-4 py-3 text-gray-400">{lead.companyName ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className="text-orange-400 font-mono text-sm">{Math.round(lead.ghostRiskScore ?? 0)}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {lead.lastStateChange ? new Date(lead.lastStateChange).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/leads/${lead.id}`} className="text-brand-400 hover:text-brand-300">
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        {/* Revenue by source */}
        {revenueBySource && revenueBySource.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Revenue by Source</h2>
            <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Source</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Platform</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Revenue</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Deals</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {revenueBySource.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-800/40 transition">
                      <td className="px-4 py-3 text-sm text-gray-300">{row.source}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{row.platform ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-green-400 font-medium">${row.revenue.toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{row.dealCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
