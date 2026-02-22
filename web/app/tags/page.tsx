'use client';

import { useState } from 'react';
import { useTags, useCreateTag, useDeleteTag } from '@/lib/queries/tags';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Trash2, Plus, Tag } from 'lucide-react';

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#64748b',
];

export default function TagsPage() {
  const { data: tags, isLoading } = useTags();
  const createTag = useCreateTag();
  const deleteTag = useDeleteTag();

  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await createTag.mutateAsync({ name: name.trim(), color });
    setName('');
  }

  return (
    <div>
      <PageHeader title="Tags" subtitle="Organize leads and deals with tags" />

      <div className="p-6 space-y-6 max-w-2xl">
        {/* Create form */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Create tag</h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex gap-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tag name…"
                className="flex-1 rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-brand-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!name.trim() || createTag.isPending}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 transition"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full transition ring-2 ring-offset-2 ring-offset-gray-900 ${color === c ? 'ring-white' : 'ring-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <p className="text-xs text-gray-600">
              Preview: <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: `${color}30`, color }}>{name || 'Tag name'}</span>
            </p>
          </form>
        </div>

        {/* Tags list */}
        {isLoading ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : tags && tags.length > 0 ? (
          <div className="rounded-xl border border-gray-800 bg-gray-900 divide-y divide-gray-800">
            {tags.map((tag) => (
              <div key={tag.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <span
                    className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                    style={tag.color ? { backgroundColor: `${tag.color}30`, color: tag.color } : { backgroundColor: '#374151', color: '#9ca3af' }}
                  >
                    {tag.name}
                  </span>
                  <span className="text-xs text-gray-600">
                    {tag._count?.leadTags ?? 0} leads · {tag._count?.dealTags ?? 0} deals
                  </span>
                </div>
                <button
                  onClick={() => {
                    if (window.confirm(`Delete tag "${tag.name}"?`)) {
                      deleteTag.mutate(tag.id);
                    }
                  }}
                  className="text-gray-600 hover:text-red-400 transition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-600">No tags yet.</p>
        )}
      </div>
    </div>
  );
}
