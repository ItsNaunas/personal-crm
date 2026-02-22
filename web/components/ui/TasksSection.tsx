'use client';

import { useState } from 'react';
import { useTasks, useCreateTask, useCompleteTask, useDeleteTask } from '@/lib/queries/tasks';
import { Skeleton } from './Skeleton';
import { CheckCircle2, Circle, Trash2, Plus } from 'lucide-react';
import type { LeadPriority } from '@/types';

interface TasksSectionProps {
  entityType?: string;
  entityId?: string;
  compact?: boolean;
}

const priorityColors: Record<LeadPriority, string> = {
  critical: 'text-red-400',
  high: 'text-orange-400',
  normal: 'text-gray-400',
  low: 'text-gray-600',
};

export function TasksSection({ entityType, entityId, compact = false }: TasksSectionProps) {
  const { data: tasks, isLoading } = useTasks({ entityType, entityId, incomplete: false });
  const createTask = useCreateTask();
  const completeTask = useCompleteTask();
  const deleteTask = useDeleteTask();
  const [title, setTitle] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [showForm, setShowForm] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await createTask.mutateAsync({ title: title.trim(), entityType, entityId, dueAt: dueAt || undefined });
    setTitle('');
    setDueAt('');
    setShowForm(false);
  }

  const incomplete = tasks?.filter((t) => !t.completedAt) ?? [];
  const completed = tasks?.filter((t) => t.completedAt) ?? [];

  return (
    <div className={`rounded-xl border border-gray-800 bg-gray-900 p-5 ${compact ? '' : ''}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-300">Tasks</h3>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition"
        >
          <Plus className="h-3 w-3" /> Add
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-4 space-y-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title…"
            className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:border-brand-500 focus:outline-none"
          />
          <input
            type="datetime-local"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-1.5 text-sm text-gray-400 focus:border-brand-500 focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={createTask.isPending || !title.trim()}
              className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-50 transition"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-800 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
        </div>
      ) : (
        <div>
          {incomplete.length === 0 && !showForm && (
            <p className="text-xs text-gray-600">No pending tasks.</p>
          )}
          <ul className="space-y-1.5">
            {incomplete.map((task) => (
              <li key={task.id} className="flex items-start gap-2 group">
                <button
                  onClick={() => completeTask.mutate(task.id)}
                  className="mt-0.5 shrink-0 text-gray-600 hover:text-green-400 transition"
                >
                  <Circle className="h-4 w-4" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-300 leading-tight">{task.title}</p>
                  {task.dueAt && (
                    <p className={`text-xs mt-0.5 ${new Date(task.dueAt) < new Date() ? 'text-red-400' : 'text-gray-500'}`}>
                      Due {new Date(task.dueAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => deleteTask.mutate(task.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
          {completed.length > 0 && (
            <details className="mt-3">
              <summary className="text-xs text-gray-600 cursor-pointer">
                {completed.length} completed
              </summary>
              <ul className="mt-2 space-y-1">
                {completed.map((task) => (
                  <li key={task.id} className="flex items-center gap-2 opacity-50">
                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    <p className="text-xs text-gray-500 line-through">{task.title}</p>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
