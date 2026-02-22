'use client';

import { useState } from 'react';
import { useTags, useLeadTags, useAddLeadTag, useRemoveLeadTag } from '@/lib/queries/tags';
import { X, Tag, Plus } from 'lucide-react';

interface TagsSectionProps {
  leadId: string;
}

export function TagsSection({ leadId }: TagsSectionProps) {
  const { data: allTags } = useTags();
  const { data: leadTags } = useLeadTags(leadId);
  const addTag = useAddLeadTag();
  const removeTag = useRemoveLeadTag();
  const [open, setOpen] = useState(false);

  const appliedIds = new Set(leadTags?.map((t) => t.id) ?? []);
  const available = allTags?.filter((t) => !appliedIds.has(t.id)) ?? [];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {leadTags?.map((tag) => (
        <span
          key={tag.id}
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-gray-700 text-gray-300"
          style={tag.color ? { backgroundColor: `${tag.color}30`, color: tag.color } : {}}
        >
          {tag.name}
          <button
            onClick={() => removeTag.mutate({ leadId, tagId: tag.id })}
            className="hover:text-red-400 transition"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      ))}
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs text-gray-500 border border-dashed border-gray-700 hover:border-brand-500 hover:text-brand-400 transition"
        >
          <Plus className="h-3 w-3" /> Tag
        </button>
        {open && (
          <div className="absolute top-6 left-0 z-20 min-w-[160px] rounded-lg border border-gray-700 bg-gray-900 shadow-xl py-1">
            {available.length === 0 ? (
              <p className="px-3 py-2 text-xs text-gray-500">No more tags</p>
            ) : (
              available.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => { addTag.mutate({ leadId, tagId: tag.id }); setOpen(false); }}
                  className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-800 transition"
                >
                  {tag.name}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
