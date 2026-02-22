import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createApiClient } from '../api';
import { useOrg } from '../org-context';
import type { SavedView } from '@/types';
import toast from 'react-hot-toast';

export function useSavedViews(entityType?: string) {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  const qs = entityType ? `?entityType=${entityType}` : '';
  return useQuery({
    queryKey: ['saved-views', orgId, entityType],
    queryFn: () => api.get<SavedView[]>(`/saved-views${qs}`),
  });
}

export function useCreateSavedView() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { name: string; entityType: string; filters: Record<string, unknown>; sort?: string; order?: string }) =>
      api.post<SavedView>('/saved-views', dto),
    onSuccess: (_, { entityType }) => {
      qc.invalidateQueries({ queryKey: ['saved-views', orgId, entityType] });
      qc.invalidateQueries({ queryKey: ['saved-views', orgId, undefined] });
      toast.success('View saved');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteSavedView() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/saved-views/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['saved-views', orgId] });
      toast.success('View deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
