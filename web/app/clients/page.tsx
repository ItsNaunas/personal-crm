'use client';

import { useRouter } from 'next/navigation';
import { useClients } from '@/lib/queries/clients';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { ExternalLink } from 'lucide-react';

function statusVariant(s: string | null | undefined) {
  if (!s) return 'gray';
  const l = s.toLowerCase();
  if (l.includes('complete') || l.includes('done') || l.includes('active')) return 'green';
  if (l.includes('pend') || l.includes('progress')) return 'yellow';
  return 'blue';
}

function RiskBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.round(score));
  const color = pct >= 70 ? 'bg-red-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-gray-800">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500">{pct}</span>
    </div>
  );
}

export default function ClientsPage() {
  const router = useRouter();
  const { data: clients, isLoading, isError, error, refetch } = useClients();

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle="Manage active clients and onboarding status"
      />

      <div className="p-6 space-y-5">
        {isLoading && <SkeletonTable rows={5} cols={7} />}
        {isError && <ErrorState message={(error as Error)?.message} onRetry={() => refetch()} />}

        {!isLoading && !isError && (!clients || clients.length === 0) && (
          <EmptyState
            icon="🤝"
            title="No active clients"
            description="Clients are created automatically when a deal is won and invoice is paid. Win your first deal to get started."
            action={{ label: 'View Deals', href: '/deals' }}
          />
        )}

        {!isLoading && !isError && clients && clients.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-800 bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Company</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Onboarding</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Delivery</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Renewal</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Churn Risk</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Satisfaction</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Since</th>
                  <th className="w-8 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 bg-gray-900/40">
                {clients.map((client) => {
                  const renewalDate = client.renewalDate ? new Date(client.renewalDate) : null;
                  const daysUntilRenewal = renewalDate
                    ? Math.ceil((renewalDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                    : null;
                  const renewalUrgent = daysUntilRenewal != null && daysUntilRenewal <= 30;

                  return (
                    <tr
                      key={client.id}
                      className="hover:bg-gray-800/50 cursor-pointer transition"
                      onClick={() => router.push(`/clients/${client.id}`)}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">{client.name}</p>
                        {client.email && <p className="text-xs text-gray-500">{client.email}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-400">{client.companyName ?? '—'}</td>
                      <td className="px-4 py-3">
                        {client.onboardingStatus ? (
                          <Badge
                            label={client.onboardingStatus}
                            variant={statusVariant(client.onboardingStatus) as 'green' | 'yellow' | 'blue' | 'gray'}
                          />
                        ) : (
                          <span className="text-gray-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {client.deliveryStatus ? (
                          <Badge
                            label={client.deliveryStatus}
                            variant={statusVariant(client.deliveryStatus) as 'green' | 'yellow' | 'blue' | 'gray'}
                          />
                        ) : (
                          <span className="text-gray-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {renewalDate ? (
                          <span className={renewalUrgent ? 'text-yellow-400 font-medium' : 'text-gray-400'}>
                            {renewalDate.toLocaleDateString()}
                            {daysUntilRenewal != null && (
                              <span className="ml-1 text-gray-600">({daysUntilRenewal}d)</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {client.churnRiskScore != null
                          ? <RiskBar score={client.churnRiskScore} />
                          : <span className="text-gray-600 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {client.satisfactionScore != null ? `${client.satisfactionScore}/10` : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(client.createdAt).toLocaleDateString()}
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
        )}
      </div>
    </div>
  );
}
