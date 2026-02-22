'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateLead } from '@/lib/queries/leads';
import { PageHeader } from '@/components/ui/PageHeader';
import { LEAD_SOURCES, PLATFORMS } from '@/types';

export default function NewLeadPage() {
  const router = useRouter();
  const { mutateAsync, isPending } = useCreateLead();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    companyName: '',
    domain: '',
    industry: '',
    location: '',
    leadSource: '',
    platform: '',
    profileLink: '',
  });

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '' }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = 'Name is required';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const lead = await mutateAsync({
        name: form.name.trim(),
        ...(form.email ? { email: form.email } : {}),
        ...(form.phone ? { phone: form.phone } : {}),
        ...(form.companyName ? { companyName: form.companyName } : {}),
        ...(form.domain ? { domain: form.domain } : {}),
        ...(form.industry ? { industry: form.industry } : {}),
        ...(form.location ? { location: form.location } : {}),
        ...(form.leadSource ? { leadSource: form.leadSource } : {}),
        ...(form.platform ? { platform: form.platform } : {}),
        ...(form.profileLink ? { profileLink: form.profileLink } : {}),
      });
      router.push(`/leads/${lead.id}`);
    } catch {
      // toast is handled in the mutation
    }
  }

  const inputCls =
    'w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-brand-500 focus:outline-none';
  const labelCls = 'block text-xs text-gray-400 mb-1';

  return (
    <div>
      <PageHeader
        title="Add Lead"
        subtitle="Create a new lead directly"
        backHref="/leads"
        backLabel="Leads"
      />

      <div className="p-6 max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelCls}>Name *</label>
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Jane Smith"
              className={inputCls}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-400">{errors.name}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="jane@example.com"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="+1 555 0100"
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Company</label>
              <input
                value={form.companyName}
                onChange={(e) => set('companyName', e.target.value)}
                placeholder="Acme Corp"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Domain</label>
              <input
                value={form.domain}
                onChange={(e) => set('domain', e.target.value)}
                placeholder="acme.com"
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Industry</label>
              <input
                value={form.industry}
                onChange={(e) => set('industry', e.target.value)}
                placeholder="SaaS"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Location</label>
              <input
                value={form.location}
                onChange={(e) => set('location', e.target.value)}
                placeholder="London, UK"
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Lead Source</label>
              <select value={form.leadSource} onChange={(e) => set('leadSource', e.target.value)} className={inputCls}>
                <option value="">Select source…</option>
                {LEAD_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Platform</label>
              <select value={form.platform} onChange={(e) => set('platform', e.target.value)} className={inputCls}>
                <option value="">Select platform…</option>
                {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Profile Link</label>
            <input
              value={form.profileLink}
              onChange={(e) => set('profileLink', e.target.value)}
              placeholder="https://linkedin.com/in/..."
              className={inputCls}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-brand-500 px-5 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 transition"
            >
              {isPending ? 'Creating…' : 'Create Lead'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/leads')}
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
