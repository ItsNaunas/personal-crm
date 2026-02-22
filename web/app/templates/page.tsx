'use client';

import { useState, useMemo } from 'react';
import { useTemplates, useCreateTemplate, useUpdateTemplate, useDeleteTemplate } from '@/lib/queries/templates';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Pencil, Trash2, Copy, Plus, Check } from 'lucide-react';
import type { Template, TemplateOutreachChannel } from '@/types';
import { TEMPLATE_OUTREACH_CHANNELS } from '@/types';
import { getPlatformBadgeClass } from '@/lib/path-platform-colors';

const OUTREACH_CHANNEL_LABELS: Record<string, string> = {
  cold_email: 'Cold email',
  linkedin: 'LinkedIn',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  twitter: 'Twitter',
  phone: 'Phone',
  other: 'Other',
};

function TemplateCard({
  template,
  variables,
  onEdit,
  onDelete,
}: {
  template: Template;
  variables: Record<string, string>;
  onEdit: (t: Template) => void;
  onDelete: (id: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const channels = Array.isArray(template.outreachChannels) ? template.outreachChannels as string[] : [];

  function render(body: string) {
    return body.replace(/\{\{(\w+)\}\}/g, (_, k: string) => variables[k] ?? `{{${k}}}`);
  }

  function copyRendered() {
    navigator.clipboard.writeText(render(template.body));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-200">{template.name}</h3>
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={copyRendered} title="Copy to clipboard" className="text-gray-500 hover:text-brand-400 transition">
            {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
          </button>
          <button onClick={() => onEdit(template)} className="text-gray-500 hover:text-brand-400 transition">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={() => onDelete(template.id)} className="text-gray-500 hover:text-red-400 transition">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      {channels.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {channels.map((ch) => (
            <span
              key={ch}
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getPlatformBadgeClass(ch)}`}
            >
              {OUTREACH_CHANNEL_LABELS[ch] ?? ch.replace('_', ' ')}
            </span>
          ))}
        </div>
      )}
      <p className="text-xs text-gray-400 whitespace-pre-wrap rounded-lg bg-gray-800/60 p-3">
        {render(template.body)}
      </p>
      {Array.isArray(template.variables) && template.variables.length > 0 && (
        <p className="text-xs text-gray-600">Variables: {template.variables.join(', ')}</p>
      )}
    </div>
  );
}

export default function TemplatesPage() {
  const { data: templates, isLoading } = useTemplates();
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();

  const [editing, setEditing] = useState<Template | null>(null);
  const [name, setName] = useState('');
  const [body, setBody] = useState('');
  const [outreachChannels, setOutreachChannels] = useState<string[]>([]);
  const [channelFilter, setChannelFilter] = useState<string>(''); // '' = All
  const [showForm, setShowForm] = useState(false);

  // Variable substitution preview values
  const [varValues, setVarValues] = useState<Record<string, string>>({});

  function openCreate() {
    setEditing(null);
    setName('');
    setBody('');
    setOutreachChannels([]);
    setShowForm(true);
  }

  function openEdit(t: Template) {
    setEditing(t);
    setName(t.name);
    setBody(t.body);
    setOutreachChannels(Array.isArray(t.outreachChannels) ? (t.outreachChannels as string[]) : []);
    setShowForm(true);
  }

  function toggleChannel(ch: TemplateOutreachChannel) {
    setOutreachChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !body.trim()) return;
    const vars = [...body.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]);
    const uniqueVars = [...new Set(vars)];

    if (editing) {
      await updateTemplate.mutateAsync({
        id: editing.id,
        name: name.trim(),
        body: body.trim(),
        variables: uniqueVars,
        outreachChannels,
      });
    } else {
      await createTemplate.mutateAsync({
        name: name.trim(),
        body: body.trim(),
        variables: uniqueVars,
        outreachChannels,
      });
    }
    setShowForm(false);
  }

  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    if (!channelFilter) return templates;
    return templates.filter((t) => {
      const ch = Array.isArray(t.outreachChannels) ? (t.outreachChannels as string[]) : [];
      return ch.includes(channelFilter);
    });
  }, [templates, channelFilter]);

  // Collect all variables across all templates
  const allVars = [...new Set(
    (templates ?? []).flatMap((t) => Array.isArray(t.variables) ? t.variables as string[] : [])
  )];

  return (
    <div>
      <PageHeader
        title="Templates"
        subtitle="Message templates with variable substitution"
        actions={
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition"
          >
            <Plus className="h-4 w-4" /> New template
          </button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Variable preview inputs */}
        {allVars.length > 0 && (
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <p className="text-xs text-gray-500 mb-3">Fill in values to preview templates with real data:</p>
            <div className="flex flex-wrap gap-3">
              {allVars.map((v) => (
                <div key={v} className="flex items-center gap-1.5">
                  <label className="text-xs text-gray-400">{`{{${v}}}`}</label>
                  <input
                    value={varValues[v] ?? ''}
                    onChange={(e) => setVarValues((prev) => ({ ...prev, [v]: e.target.value }))}
                    placeholder={v}
                    className="w-32 rounded-lg bg-gray-800 border border-gray-700 px-2 py-1 text-xs text-gray-200 focus:border-brand-500 focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form */}
        {showForm && (
          <div className="rounded-xl border border-gray-700 bg-gray-900 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-200">{editing ? 'Edit template' : 'New template'}</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Template name…"
                  className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Body (use {'{{variable}}'} for placeholders)</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={5}
                  placeholder="Hi {{name}}, I saw your work at {{company}}…"
                  className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-brand-500 focus:outline-none resize-y"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-2">Outreach channel (IG, cold email, TikTok, LinkedIn, etc.)</label>
                <div className="flex flex-wrap gap-2">
                  {TEMPLATE_OUTREACH_CHANNELS.map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => toggleChannel(ch)}
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                        outreachChannels.includes(ch)
                          ? `${getPlatformBadgeClass(ch)} border-transparent`
                          : 'border-gray-700 text-gray-500 hover:border-gray-600 hover:text-gray-400'
                      }`}
                    >
                      {OUTREACH_CHANNEL_LABELS[ch]}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-600 mt-1">Select one or more; used to filter templates by outreach type.</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={!name.trim() || !body.trim() || createTemplate.isPending || updateTemplate.isPending}
                  className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 transition"
                >
                  {editing ? 'Save changes' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-400 hover:bg-gray-800 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filter by outreach channel */}
        {templates && templates.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500">Filter by channel:</span>
            <button
              onClick={() => setChannelFilter('')}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                !channelFilter ? 'bg-gray-700 text-gray-200 border-gray-600' : 'border-gray-700 text-gray-500 hover:border-gray-600'
              }`}
            >
              All
            </button>
            {TEMPLATE_OUTREACH_CHANNELS.map((ch) => (
              <button
                key={ch}
                onClick={() => setChannelFilter(channelFilter === ch ? '' : ch)}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                  channelFilter === ch ? `${getPlatformBadgeClass(ch)} border-transparent` : 'border-gray-700 text-gray-500 hover:border-gray-600'
                }`}
              >
                {OUTREACH_CHANNEL_LABELS[ch]}
              </button>
            ))}
          </div>
        )}

        {/* Templates list */}
        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
        ) : filteredTemplates && filteredTemplates.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((t) => (
              <TemplateCard
                key={t.id}
                template={t}
                variables={varValues}
                onEdit={openEdit}
                onDelete={(id) => deleteTemplate.mutate(id)}
              />
            ))}
          </div>
        ) : templates && templates.length > 0 ? (
          <p className="text-sm text-gray-600">No templates match the selected channel. Clear the filter or add that channel to a template.</p>
        ) : (
          <p className="text-sm text-gray-600">No templates yet. Create one to get started.</p>
        )}
      </div>
    </div>
  );
}
