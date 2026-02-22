'use client';

import { useState } from 'react';
import { useNotes, useCreateNote, useDeleteNote } from '@/lib/queries/notes';
import { Skeleton } from './Skeleton';
import { Pencil, Trash2 } from 'lucide-react';

interface NotesSectionProps {
  entityType: string;
  entityId: string;
}

export function NotesSection({ entityType, entityId }: NotesSectionProps) {
  const { data: notes, isLoading } = useNotes(entityType, entityId);
  const createNote = useCreateNote();
  const deleteNote = useDeleteNote();
  const [body, setBody] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    await createNote.mutateAsync({ entityType, entityId, body: body.trim() });
    setBody('');
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <h3 className="text-sm font-semibold text-gray-300 mb-4">Notes</h3>

      <form onSubmit={handleSubmit} className="mb-4">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Add a note…"
          className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-brand-500 focus:outline-none resize-none"
        />
        <button
          type="submit"
          disabled={createNote.isPending || !body.trim()}
          className="mt-2 rounded-lg bg-brand-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-50 transition"
        >
          {createNote.isPending ? 'Saving…' : 'Add note'}
        </button>
      </form>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : notes && notes.length > 0 ? (
        <ul className="space-y-3">
          {notes.map((note) => (
            <li key={note.id} className="rounded-lg bg-gray-800/60 border border-gray-700/50 p-3">
              <p className="text-sm text-gray-300 whitespace-pre-wrap">{note.body}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-gray-600">
                  {new Date(note.createdAt).toLocaleString()}
                </span>
                <button
                  onClick={() => deleteNote.mutate({ id: note.id, entityType, entityId })}
                  className="text-gray-600 hover:text-red-400 transition"
                  title="Delete note"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-gray-600">No notes yet.</p>
      )}
    </div>
  );
}
