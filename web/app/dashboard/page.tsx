'use client';

import Link from 'next/link';
import { getPathBarClass } from '@/lib/path-platform-colors';
import { useDashboard, useLeadsBySource, useLeadsByPath, useStaleLeads } from '@/lib/queries/analytics';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  Users,
  Briefcase,
  TrendingUp,
  Award,
  Clock,
  ArrowRight,
  AlertTriangle,
  TrendingDown,
} from 'lucide-react';

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  href,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  href?: string;
  accent?: 'red' | 'yellow';
}) {
  const content = (
    <div className={`rounded-xl border bg-gray-900 p-5 hover:border-gray-700 transition ${accent === 'red' ? 'border-red-900/60' : accent === 'yellow' ? 'border-yellow-800/60' : 'border-gray-800'}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</span>
        <Icon className={`h-4 w-4 ${accent === 'red' ? 'text-red-600' : accent === 'yellow' ? 'text-yellow-600' : 'text-gray-600'}`} />
      </div>
      <p className={`text-2xl font-bold ${accent === 'red' ? 'text-red-400' : accent === 'yellow' ? 'text-yellow-400' : 'text-white'}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
      {href && (
        <div className="mt-3 flex items-center gap-1 text-xs text-brand-400">
          View all <ArrowRight className="h-3 w-3" />
        </div>
      )}
    </div>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}

function FunnelBar({ stage, count, max }: { stage: string; count: number; max: number }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-400 capitalize">{stage.replace('_', ' ')}</span>
        <span className="text-gray-400">{count}</span>
      </div>
      <div className="h-2 rounded-full bg-gray-800">
        <div
          className="h-2 rounded-full bg-brand-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function HBarList({
  items,
  max,
  getBarColor,
}: {
  items: { label: string; count: number }[];
  max: number;
  getBarColor?: (label: string) => string;
}) {
  return (
    <div className="space-y-2">
      {items.map(({ label, count }) => {
        const pct = max > 0 ? Math.round((count / max) * 100) : 0;
        const barClass = getBarColor?.(label) ?? 'bg-brand-500/70';
        return (
          <div key={label} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400 capitalize">{label.replace('_', ' ')}</span>
              <span className="text-gray-500">{count}</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-800">
              <div className={`h-1.5 rounded-full ${barClass} transition-all`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading, isError, error, refetch } = useDashboard();
  const { data: bySource } = useLeadsBySource();
  const { data: byPath } = useLeadsByPath();
  const { data: staleData } = useStaleLeads(7);

  const totalLeads = data?.funnel?.reduce((sum, f) => sum + f.count, 0) ?? 0;
  const qualifiedLeads = data?.funnel
    ?.filter((f) => ['qualified', 'proposal', 'negotiation'].includes(f.stage))
    .reduce((sum, f) => sum + f.count, 0) ?? 0;
  const qualifiedPct = totalLeads > 0 ? Math.round((qualifiedLeads / totalLeads) * 100) : 0;

  const maxFunnelCount = data?.funnel?.reduce((m, f) => Math.max(m, f.count), 1) ?? 1;
  const maxSourceCount = bySource?.[0]?.count ?? 1;
  const maxPathCount = byPath?.[0]?.count ?? 1;

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="CRM overview at a glance" />

      <div className="p-6 space-y-8">
        {isError && (
          <ErrorState
            message={(error as Error)?.message}
            onRetry={() => refetch()}
          />
        )}

        {/* Summary cards */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
            Overview
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {isLoading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : (
              <>
                <StatCard
                  label="Total Leads"
                  value={totalLeads}
                  sub={`${qualifiedPct}% qualified`}
                  icon={Users}
                  href="/leads"
                />
                <StatCard
                  label="Pipeline Value"
                  value={
                    data?.pipeline?.totalPipeline != null
                      ? `$${data.pipeline.totalPipeline.toLocaleString()}`
                      : '—'
                  }
                  sub={`${data?.pipeline?.dealCount ?? 0} active deals`}
                  icon={Briefcase}
                  href="/deals"
                />
                <StatCard
                  label="Weighted Pipeline"
                  value={
                    data?.pipeline?.weightedPipeline != null
                      ? `$${Math.round(data.pipeline.weightedPipeline).toLocaleString()}`
                      : '—'
                  }
                  sub="Probability-adjusted"
                  icon={TrendingUp}
                />
                <StatCard
                  label="Avg Days to Close"
                  value={data?.velocity?.avgDaysToClose ?? '—'}
                  sub={`${data?.velocity?.conversionRatePercent ?? 0}% conversion`}
                  icon={Clock}
                />
              </>
            )}
          </div>
        </section>

        {/* Risk & attention cards */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
            Attention Required
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label="Stale Leads"
              value={staleData?.count ?? '—'}
              sub="No activity in 7+ days"
              icon={AlertTriangle}
              href="/leads"
              accent={staleData?.count ? 'yellow' : undefined}
            />
            <StatCard
              label="Est. Lost Revenue"
              value={
                data?.lostRevenue?.estimatedLost != null
                  ? `$${Math.round(data.lostRevenue.estimatedLost).toLocaleString()}`
                  : '—'
              }
              sub={`${data?.lostRevenue?.lostDeals ?? 0} lost deals`}
              icon={TrendingDown}
              accent={data?.lostRevenue?.lostDeals ? 'red' : undefined}
            />
            <StatCard
              label="Won Deals"
              value={data?.velocity?.wonDeals ?? '—'}
              sub={`of ${data?.velocity?.totalDeals ?? 0} total`}
              icon={Award}
            />
          </div>
        </section>

        {/* Pipeline velocity */}
        {!isLoading && data?.velocity && (
          <section>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
              Revenue Velocity
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard
                label="Avg Discovery Days"
                value={data.velocity.avgDaysInDiscovery ?? '—'}
                icon={Clock}
              />
              <StatCard
                label="Avg Proposal Days"
                value={data.velocity.avgDaysInProposal ?? '—'}
                icon={Clock}
              />
              <StatCard
                label="Avg Negotiation Days"
                value={data.velocity.avgDaysInNegotiation ?? '—'}
                icon={Clock}
              />
            </div>
          </section>
        )}

        {/* Leads by source + recommended path */}
        {!isLoading && (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Lead funnel */}
            <div className="lg:col-span-1">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                  Lead Funnel
                </h2>
                <Link href="/leads" className="text-xs text-brand-400 hover:text-brand-300 transition flex items-center gap-1">
                  View <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
                {!data?.funnel || data.funnel.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-sm text-gray-500">No leads yet.</p>
                    <Link href="/intake" className="mt-3 inline-flex text-sm text-brand-400 hover:underline">
                      Add your first lead →
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.funnel.map((item) => (
                      <FunnelBar
                        key={item.stage}
                        stage={item.stage}
                        count={item.count}
                        max={maxFunnelCount}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Leads by source */}
            <div>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
                Leads by Source
              </h2>
              <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
                {!bySource || bySource.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 text-center">No data yet.</p>
                ) : (
                  <HBarList
                    items={bySource.slice(0, 8).map((s) => ({ label: s.source, count: s.count }))}
                    max={maxSourceCount}
                  />
                )}
              </div>
            </div>

            {/* Leads by recommended path */}
            <div>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
                By Recommended Path
              </h2>
              <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
                {!byPath || byPath.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 text-center">No data yet.</p>
                ) : (
                  <HBarList
                    items={byPath.map((p) => ({ label: p.path, count: p.count }))}
                    max={maxPathCount}
                    getBarColor={(label) => getPathBarClass(label)}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Quick links */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
            Quick Actions
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { href: '/intake', label: 'Add Lead', desc: 'Import or create a new lead' },
              { href: '/deals', label: 'View Pipeline', desc: 'See all active deals' },
              { href: '/calls', label: 'Book a Call', desc: 'Schedule a call with a lead' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900 p-4 hover:border-brand-500/40 hover:bg-gray-800/60 transition"
              >
                <div>
                  <p className="text-sm font-medium text-white">{item.label}</p>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-600" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
