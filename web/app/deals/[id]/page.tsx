'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useDeal, useUpdateDealStage, useUpdateDeal } from '@/lib/queries/deals';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge, dealStageBadge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import type { DealStage } from '@/types';
import Link from 'next/link';

const STAGES: DealStage[] = ['discovery', 'proposal', 'negotiation', 'won', 'lost'];

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-800 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm text-gray-300">{value ?? '—'}</span>
    </div>
  );
}

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: deal, isLoading, isError, error, refetch } = useDeal(id);
  const updateStage = useUpdateDealStage();
  const updateDeal = useUpdateDeal();

  const [stageEdit, setStageEdit] = useState(false);
  const [lostReason, setLostReason] = useState('');
  const [pendingStage, setPendingStage] = useState<DealStage | null>(null);

  const [editingValue, setEditingValue] = useState(false);
  const [newValue, setNewValue] = useState('');
  const [newProb, setNewProb] = useState('');

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-32 w-full" />
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

  if (!deal) return null;

  const stageMeta = dealStageBadge(deal.stage);
  const weighted = deal.weightedValue ?? deal.dealValue * (deal.probability ?? 0);

  function handleStageClick(stage: DealStage) {
    if (stage === 'lost') {
      setPendingStage(stage);
      return;
    }
    updateStage.mutate({ id: deal!.id, dto: { stage } });
    setStageEdit(false);
  }

  function confirmLost() {
    if (!pendingStage) return;
    updateStage.mutate({ id: deal!.id, dto: { stage: pendingStage, lostReason } });
    setPendingStage(null);
    setLostReason('');
    setStageEdit(false);
  }

  function saveValueEdit() {
    updateDeal.mutate({
      id: deal!.id,
      dto: {
        ...(newValue ? { dealValue: Number(newValue) } : {}),
        ...(newProb ? { probability: Number(newProb) } : {}),
      },
    });
    setEditingValue(false);
  }

  return (
    <div>
      <PageHeader
        title={deal.lead?.name ?? `Deal · ${id.slice(0, 8)}`}
        subtitle={`${deal.lead?.companyName ?? ''} · Deal`}
        backHref="/deals"
        backLabel="Deals"
        actions={
          deal.lead?.id ? (
            <Link
              href={`/leads/${deal.lead.id}`}
              className="rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 transition"
            >
              View Lead
            </Link>
          ) : undefined
        }
      />

      <div className="p-6 grid gap-6 lg:grid-cols-2">
        {/* Stage card */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-300">Deal Stage</h3>
            <button
              onClick={() => setStageEdit((v) => !v)}
              className="text-xs text-brand-400 hover:text-brand-300 transition"
            >
              {stageEdit ? 'Cancel' : 'Update Stage'}
            </button>
          </div>
          <Badge label={stageMeta.label} variant={stageMeta.variant} />

          {stageEdit && (
            <div className="mt-4 flex flex-wrap gap-2">
              {STAGES.map((s) => {
                const meta = dealStageBadge(s);
                return (
                  <button
                    key={s}
                    onClick={() => handleStageClick(s)}
                    disabled={updateStage.isPending || s === deal.stage}
                    className="rounded-full border border-gray-700 px-3 py-1 text-xs text-gray-300 hover:border-brand-500 hover:text-brand-400 disabled:opacity-40 transition"
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Lost reason modal */}
          {pendingStage === 'lost' && (
            <div className="mt-4 space-y-3 rounded-lg bg-gray-800 p-4">
              <label className="block text-xs text-gray-400">
                Reason for losing this deal (optional)
              </label>
              <input
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                placeholder="Competitor, budget, timing…"
                className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 focus:border-brand-500 focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={confirmLost}
                  className="rounded-lg bg-red-600 px-4 py-1.5 text-xs text-white hover:bg-red-700 transition"
                >
                  Confirm Lost
                </button>
                <button
                  onClick={() => setPendingStage(null)}
                  className="rounded-lg border border-gray-700 px-4 py-1.5 text-xs text-gray-300 hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Value card */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-300">Financials</h3>
            <button
              onClick={() => {
                setNewValue(String(deal.dealValue));
                setNewProb(String(deal.probability ?? 0.5));
                setEditingValue((v) => !v);
              }}
              className="text-xs text-brand-400 hover:text-brand-300 transition"
            >
              {editingValue ? 'Cancel' : 'Edit'}
            </button>
          </div>

          {editingValue ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Deal Value ($)</label>
                <input
                  type="number"
                  min="0"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Probability ({Math.round(Number(newProb) * 100)}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={newProb}
                  onChange={(e) => setNewProb(e.target.value)}
                  className="w-full accent-brand-500"
                />
              </div>
              <button
                onClick={saveValueEdit}
                disabled={updateDeal.isPending}
                className="rounded-lg bg-brand-500 px-4 py-1.5 text-xs text-white hover:bg-brand-600 disabled:opacity-50 transition"
              >
                {updateDeal.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          ) : (
            <>
              <InfoRow label="Deal Value" value={`$${deal.dealValue.toLocaleString()}`} />
              <InfoRow
                label="Probability"
                value={`${Math.round((deal.probability ?? 0) * 100)}%`}
              />
              <InfoRow
                label="Weighted Value"
                value={`$${Math.round(weighted).toLocaleString()}`}
              />
              {deal.lostReason && (
                <InfoRow label="Lost Reason" value={deal.lostReason} />
              )}
              <InfoRow label="Created" value={new Date(deal.createdAt).toLocaleString()} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
