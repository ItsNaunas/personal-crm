'use client';

import { useLeads, useUpdateLeadTemperature } from '@/lib/queries/leads';
import { PageHeader } from '@/components/ui/PageHeader';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge, lifecycleStageBadge } from '@/components/ui/Badge';
import { TemperatureSelect } from '@/components/ui/TemperatureSelect';
import Link from 'next/link';
const TEMPERATURES: (Temperature | '')[] = ['', 'cold', 'warm', 'hot'];

import { ExternalLink } from 'lucide-react';
import type { Temperature } from '@/types';

export default function OutreachPage() {
  const { data: leads, isLoading, isError, error, refetch } = useLeads();
  const updateTemperature = useUpdateLeadTemperature();

  // Filter to leads with recommendedPath = 'outreach'
  const outreachLeads = leads?.data.filter((l) => l.recommendedPath === 'outreach') ?? [];

  return (
    <div>
      <PageHeader
        title="Outreach"
        subtitle="Leads qualified for outreach outreach — read only"
      />

      <div className="p-6 space-y-4">
        <div className="rounded-xl border border-yellow-800/40 bg-yellow-900/10 px-4 py-3">
          <p className="text-xs text-yellow-400">
            This page shows leads the AI has routed to the <strong>outreach</strong> path. Email/sequence sending is coming in a future release.
          </p>
        </div>

        {isLoading && <SkeletonTable rows={4} cols={4} />}
        {isError && <ErrorState message={(error as Error)?.message} onRetry={() => refetch()} />}

        {!isLoading && !isError && outreachLeads.length === 0 && (
          <EmptyState
            icon="📤"
            title="No outreach leads yet"
            description="Once leads are qualified and routed to the outreach path, they'll appear here."
            action={{ label: 'View All Leads', href: '/leads' }}
          />
        )}

        {!isLoading && !isError && outreachLeads.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-gray-800">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-800 bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Company</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Stage</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Temperature</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">ICP Score</th>
                  <th className="w-8 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 bg-gray-900/40">
                {outreachLeads.map((lead) => {
                  const stageMeta = lifecycleStageBadge(lead.lifecycleStage);
                  return (
                    <tr key={lead.id} className="hover:bg-gray-800/40 transition">
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">{lead.name}</p>
                        {lead.email && <p className="text-xs text-gray-500">{lead.email}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-400">{lead.companyName ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Badge label={stageMeta.label} variant={stageMeta.variant} />
                      </td>
                      <td className="px-4 py-3">
                        <TemperatureSelect
                          value={(lead.temperature ?? '') as Temperature | ''}
                          onChange={(val) => updateTemperature.mutate({ id: lead.id, temperature: val || null })}
                          disabled={updateTemperature.isPending}
                        />
                      </td>
                      <td className="px-4 py-3 text-gray-400">{lead.icpScore ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Link href={`/leads/${lead.id}`} className="text-brand-400 hover:text-brand-300">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
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
