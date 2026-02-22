'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useClient, useUpdateClientStatus } from '@/lib/queries/clients';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-800 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm text-gray-300">{value ?? '—'}</span>
    </div>
  );
}

function RiskBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.round(score));
  const color = pct >= 70 ? 'bg-red-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <div className="flex items-center gap-2 mt-0.5">
      <div className="h-2 w-24 rounded-full bg-gray-800">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-400">{pct}/100</span>
    </div>
  );
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: client, isLoading, isError, error, refetch } = useClient(id);
  const updateStatus = useUpdateClientStatus();

  const [editing, setEditing] = useState(false);
  const [onboarding, setOnboarding] = useState('');
  const [delivery, setDelivery] = useState('');

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-48 w-full max-w-lg" />
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

  if (!client) return null;

  const renewalDate = client.renewalDate ? new Date(client.renewalDate) : null;
  const daysUntilRenewal = renewalDate
    ? Math.ceil((renewalDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const renewalUrgent = daysUntilRenewal != null && daysUntilRenewal <= 30;

  function startEdit() {
    setOnboarding(client!.onboardingStatus ?? '');
    setDelivery(client!.deliveryStatus ?? '');
    setEditing(true);
  }

  function save() {
    updateStatus.mutate({
      id: client!.id,
      onboardingStatus: onboarding || undefined,
      deliveryStatus: delivery || undefined,
    });
    setEditing(false);
  }

  const inputCls = 'w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 focus:border-brand-500 focus:outline-none';
  const labelCls = 'block text-xs text-gray-400 mb-1';

  return (
    <div>
      <PageHeader
        title={client.name}
        subtitle={client.companyName ?? 'Client detail'}
        backHref="/clients"
        backLabel="Clients"
      />

      <div className="p-6 grid gap-5 lg:grid-cols-2 max-w-3xl">
        {/* Details */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Contact Details</h3>
          <InfoRow label="Email" value={client.email} />
          <InfoRow label="Company" value={client.companyName} />
          <InfoRow label="Since" value={new Date(client.createdAt).toLocaleString()} />
          {client.contractUrl && (
            <div className="flex justify-between py-2 border-b border-gray-800 last:border-0">
              <span className="text-xs text-gray-500">Contract</span>
              <a
                href={client.contractUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-brand-400 hover:underline"
              >
                Open <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </div>

        {/* Risk & Health */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Health & Risk</h3>

          <div className="py-2 border-b border-gray-800">
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">Churn Risk</span>
            </div>
            {client.churnRiskScore != null
              ? <RiskBar score={client.churnRiskScore} />
              : <span className="text-sm text-gray-600">—</span>}
          </div>

          <div className="py-2 border-b border-gray-800">
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">Satisfaction</span>
              <span className="text-sm text-gray-300">
                {client.satisfactionScore != null ? `${client.satisfactionScore}/10` : '—'}
              </span>
            </div>
          </div>

          <div className="py-2 border-b border-gray-800 last:border-0">
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">Renewal Date</span>
              <span className={`text-sm ${renewalUrgent ? 'text-yellow-400 font-medium' : 'text-gray-300'}`}>
                {renewalDate
                  ? `${renewalDate.toLocaleDateString()}${daysUntilRenewal != null ? ` (${daysUntilRenewal}d)` : ''}`
                  : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Status (edit) */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-300">Delivery Status</h3>
            <button
              onClick={() => (editing ? save() : startEdit())}
              disabled={updateStatus.isPending}
              className="text-xs text-brand-400 hover:text-brand-300 transition"
            >
              {editing ? (updateStatus.isPending ? 'Saving…' : 'Save') : 'Edit'}
            </button>
          </div>

          {editing ? (
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Onboarding Status</label>
                <input
                  value={onboarding}
                  onChange={(e) => setOnboarding(e.target.value)}
                  placeholder="e.g. in_progress"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Delivery Status</label>
                <input
                  value={delivery}
                  onChange={(e) => setDelivery(e.target.value)}
                  placeholder="e.g. active"
                  className={inputCls}
                />
              </div>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="text-xs text-gray-500 hover:text-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <InfoRow label="Onboarding" value={client.onboardingStatus} />
              <InfoRow label="Delivery" value={client.deliveryStatus} />
            </>
          )}
        </div>

        {/* Related lead / deal */}
        {(client.lead || client.deal) && (
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Related</h3>
            {client.lead && (
              <div className="flex justify-between py-2 border-b border-gray-800">
                <span className="text-xs text-gray-500">Lead</span>
                <Link
                  href={`/leads/${client.leadId}`}
                  className="text-sm text-brand-400 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {client.lead.name}
                </Link>
              </div>
            )}
            {client.deal && (
              <div className="flex justify-between py-2">
                <span className="text-xs text-gray-500">Deal</span>
                <Link
                  href={`/deals/${client.dealId}`}
                  className="text-sm text-brand-400 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  ${client.deal.dealValue?.toLocaleString() ?? '—'} · {client.deal.stage}
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
