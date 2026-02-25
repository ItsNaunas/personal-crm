'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCreateDeal } from '@/lib/queries/deals';
import { useLeads } from '@/lib/queries/leads';
import { PageHeader } from '@/components/ui/PageHeader';

export default function NewDealPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { mutateAsync, isPending } = useCreateDeal();
  const { data: leads } = useLeads();

  const prefillLeadId = searchParams.get('leadId') ?? '';

  const [form, setForm] = useState({
    leadId: prefillLeadId,
    dealValue: '',
    probability: '0.5',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (prefillLeadId) setForm((f) => ({ ...f, leadId: prefillLeadId }));
  }, [prefillLeadId]);

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '' }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!form.leadId) newErrors.leadId = 'Please select a lead';
    if (!form.dealValue || isNaN(Number(form.dealValue)) || Number(form.dealValue) < 0)
      newErrors.dealValue = 'Enter a valid deal value';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const deal = await mutateAsync({
        leadId: form.leadId,
        dealValue: Number(form.dealValue),
        probability: Number(form.probability),
      });
      router.push(`/deals/${deal.id}`);
    } catch {
      // handled in mutation
    }
  }

  const inputCls =
    'w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 focus:border-brand-500 focus:outline-none';
  const labelCls = 'block text-xs text-gray-400 mb-1';

  return (
    <div>
      <PageHeader
        title="Create Deal"
        subtitle="Link a deal to an existing lead"
        backHref="/deals"
        backLabel="Deals"
      />

      <div className="p-6 max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelCls}>Lead *</label>
            <select
              value={form.leadId}
              onChange={(e) => set('leadId', e.target.value)}
              className={inputCls}
            >
              <option value="">Select a lead…</option>
              {leads?.data.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} {l.companyName ? `· ${l.companyName}` : ''}
                </option>
              ))}
            </select>
            {errors.leadId && (
              <p className="mt-1 text-xs text-red-400">{errors.leadId}</p>
            )}
          </div>

          <div>
            <label className={labelCls}>Deal Value ($) *</label>
            <input
              type="number"
              min="0"
              value={form.dealValue}
              onChange={(e) => set('dealValue', e.target.value)}
              placeholder="10000"
              className={inputCls}
            />
            {errors.dealValue && (
              <p className="mt-1 text-xs text-red-400">{errors.dealValue}</p>
            )}
          </div>

          <div>
            <label className={labelCls}>
              Probability ({Math.round(Number(form.probability) * 100)}%)
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={form.probability}
              onChange={(e) => set('probability', e.target.value)}
              className="w-full accent-brand-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-brand-500 px-5 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 transition"
            >
              {isPending ? 'Creating…' : 'Create Deal'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/deals')}
              className="rounded-lg border border-gray-700 px-5 py-2 text-sm text-gray-300 hover:bg-gray-800 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
