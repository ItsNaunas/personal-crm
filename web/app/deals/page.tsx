'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDeals } from '@/lib/queries/deals';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge, dealStageBadge } from '@/components/ui/Badge';
import { Plus, ExternalLink } from 'lucide-react';
import type { DealStage } from '@/types';

const PIPELINE_STAGES: DealStage[] = ['discovery', 'proposal', 'negotiation', 'won', 'lost'];

function fmtCurrency(n: number) {
  return `$${n.toLocaleString()}`;
}

export default function DealsPage() {
  const router = useRouter();
  const { data: deals, isLoading, isError, error, refetch } = useDeals();

  // Group deals by stage for pipeline view
  const byStage: Record<DealStage, typeof deals> = {
    discovery: [],
    proposal: [],
    negotiation: [],
    won: [],
    lost: [],
  };
  deals?.forEach((deal) => {
    byStage[deal.stage]?.push(deal);
  });

  const activeDeals = deals?.filter((d) => d.stage !== 'won' && d.stage !== 'lost') ?? [];
  const totalPipeline = activeDeals.reduce((s, d) => s + d.dealValue, 0);

  return (
    <div>
      <PageHeader
        title="Deals"
        subtitle={
          deals
            ? `${activeDeals.length} active · ${fmtCurrency(totalPipeline)} pipeline`
            : 'Pipeline overview'
        }
        actions={
          <Link
            href="/deals/new"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600 transition"
          >
            <Plus className="h-4 w-4" />
            Create Deal
          </Link>
        }
      />

      <div className="p-6 space-y-8">
        {isLoading && <SkeletonTable rows={5} cols={5} />}

        {isError && (
          <ErrorState message={(error as Error)?.message} onRetry={() => refetch()} />
        )}

        {!isLoading && !isError && (!deals || deals.length === 0) && (
          <EmptyState
            icon="💼"
            title="No deals yet"
            description="Create a deal linked to a lead to start tracking your pipeline."
            action={{ label: 'Create deal', href: '/deals/new' }}
          />
        )}

        {/* Pipeline board */}
        {!isLoading && !isError && deals && deals.length > 0 && (
          <>
            <section>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
                Pipeline Board
              </h2>
              <div className="grid grid-cols-3 xl:grid-cols-5 gap-3 overflow-x-auto pb-2">
                {PIPELINE_STAGES.map((stage) => {
                  const stageMeta = dealStageBadge(stage);
                  const stageDeals = byStage[stage] ?? [];
                  const stageTotal = stageDeals.reduce((s, d) => s + d.dealValue, 0);
                  return (
                    <div key={stage} className="min-w-[180px]">
                      <div className="mb-2 flex items-center justify-between px-1">
                        <Badge label={stageMeta.label} variant={stageMeta.variant} />
                        <span className="text-xs text-gray-500">{stageDeals.length}</span>
                      </div>
                      {stageTotal > 0 && (
                        <p className="mb-2 px-1 text-xs text-gray-500">
                          {fmtCurrency(stageTotal)}
                        </p>
                      )}
                      <div className="space-y-2">
                        {stageDeals.length === 0 && (
                          <div className="rounded-lg border border-dashed border-gray-800 p-3 text-xs text-gray-600 text-center">
                            Empty
                          </div>
                        )}
                        {stageDeals.map((deal) => {
                          const daysInStage = deal.stageLastChangedAt
                            ? Math.floor((Date.now() - new Date(deal.stageLastChangedAt).getTime()) / (1000 * 60 * 60 * 24))
                            : null;
                          const isStale = daysInStage != null && daysInStage > 14;
                          return (
                            <div
                              key={deal.id}
                              onClick={() => router.push(`/deals/${deal.id}`)}
                              className={`cursor-pointer rounded-lg border bg-gray-900 p-3 hover:bg-gray-800/70 transition ${isStale ? 'border-yellow-700/50' : 'border-gray-800 hover:border-gray-700'}`}
                            >
                              <p className="text-xs font-medium text-white truncate">
                                {deal.lead?.name ?? `Deal ${deal.id.slice(0, 6)}`}
                              </p>
                              {deal.lead?.companyName && (
                                <p className="text-xs text-gray-600 truncate">{deal.lead.companyName}</p>
                              )}
                              <p className="mt-1 text-xs text-gray-400">
                                {fmtCurrency(deal.dealValue)}
                              </p>
                              <p className="text-xs text-gray-600">
                                {Math.round((deal.probability ?? 0) * 100)}% prob
                              </p>
                              {daysInStage != null && (
                                <p className={`text-xs mt-1 ${isStale ? 'text-yellow-500' : 'text-gray-600'}`}>
                                  {daysInStage}d in stage{isStale ? ' ⚠' : ''}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Table */}
            <section>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
                All Deals
              </h2>
              <div className="overflow-hidden rounded-xl border border-gray-800">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-800 bg-gray-900">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Lead</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Company</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Stage</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Days in Stage</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Value</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Probability</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Weighted</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Created</th>
                      <th className="w-8 px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800 bg-gray-900/40">
                    {deals.map((deal) => {
                      const stageMeta = dealStageBadge(deal.stage);
                      const daysInStage = deal.stageLastChangedAt
                        ? Math.floor((Date.now() - new Date(deal.stageLastChangedAt).getTime()) / (1000 * 60 * 60 * 24))
                        : null;
                      const isStale = daysInStage != null && daysInStage > 14 && deal.stage !== 'won' && deal.stage !== 'lost';
                      return (
                        <tr
                          key={deal.id}
                          className="hover:bg-gray-800/50 cursor-pointer transition"
                          onClick={() => router.push(`/deals/${deal.id}`)}
                        >
                          <td className="px-4 py-3 text-white">
                            {deal.lead?.name ?? deal.leadId.slice(0, 8)}
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-xs">
                            {deal.lead?.companyName ?? <span className="text-gray-600">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <Badge label={stageMeta.label} variant={stageMeta.variant} />
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {daysInStage != null
                              ? <span className={isStale ? 'text-yellow-400 font-medium' : 'text-gray-400'}>{daysInStage}d{isStale ? ' ⚠' : ''}</span>
                              : <span className="text-gray-600">—</span>}
                          </td>
                          <td className="px-4 py-3 text-gray-300">{fmtCurrency(deal.dealValue)}</td>
                          <td className="px-4 py-3 text-gray-400">
                            {Math.round((deal.probability ?? 0) * 100)}%
                          </td>
                          <td className="px-4 py-3 text-gray-400">
                            {deal.weightedValue != null
                              ? fmtCurrency(Math.round(deal.weightedValue))
                              : fmtCurrency(
                                  Math.round(deal.dealValue * (deal.probability ?? 0)),
                                )}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            {new Date(deal.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <ExternalLink className="h-3.5 w-3.5 text-gray-600" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
