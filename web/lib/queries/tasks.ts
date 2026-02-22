import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createApiClient } from '../api';
import { useOrg } from '../org-context';
import type { Task, LeadPriority } from '@/types';
import toast from 'react-hot-toast';

export function useTasks(opts?: { entityType?: string; entityId?: string; incomplete?: boolean }) {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  const params = new URLSearchParams();
  if (opts?.entityType) params.set('entityType', opts.entityType);
  if (opts?.entityId) params.set('entityId', opts.entityId);
  if (opts?.incomplete) params.set('incomplete', 'true');
  const qs = params.toString();
  return useQuery({
    queryKey: ['tasks', orgId, opts],
    queryFn: () => api.get<Task[]>(`/tasks${qs ? `?${qs}` : ''}`),
  });
}

export function useCreateTask() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { title: string; entityType?: string; entityId?: string; dueAt?: string; priority?: LeadPriority }) =>
      api.post<Task>('/tasks', dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', orgId] });
      toast.success('Task created');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useCompleteTask() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch<Task>(`/tasks/${id}/complete`, {}),
    onSuccess: (data, id) => {
      if (data) {
        qc.setQueriesData(
          { queryKey: ['tasks', orgId], exact: false },
          (cached: unknown) => {
            if (!Array.isArray(cached)) return cached;
            return cached.map((task: Task) => (task.id === id ? data : task));
          },
        );
      }
      qc.invalidateQueries({ queryKey: ['tasks', orgId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteTask() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/tasks/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', orgId] });
      toast.success('Task deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
