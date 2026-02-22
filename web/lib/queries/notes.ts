import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createApiClient } from '../api';
import { useOrg } from '../org-context';
import type { Note } from '@/types';
import toast from 'react-hot-toast';

export function useNotes(entityType: string, entityId: string) {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  return useQuery({
    queryKey: ['notes', orgId, entityType, entityId],
    queryFn: () => api.get<Note[]>(`/notes?entityType=${entityType}&entityId=${entityId}`),
    enabled: !!entityId,
  });
}

export function useCreateNote() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { entityType: string; entityId: string; body: string }) =>
      api.post<Note>('/notes', dto),
    onSuccess: (_, { entityType, entityId }) => {
      qc.invalidateQueries({ queryKey: ['notes', orgId, entityType, entityId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateNote() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: string; entityType: string; entityId: string }) =>
      api.patch<Note>(`/notes/${id}`, { body }),
    onSuccess: (_, { entityType, entityId }) => {
      qc.invalidateQueries({ queryKey: ['notes', orgId, entityType, entityId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteNote() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; entityType: string; entityId: string }) =>
      api.delete(`/notes/${id}`),
    onSuccess: (_, { entityType, entityId }) => {
      qc.invalidateQueries({ queryKey: ['notes', orgId, entityType, entityId] });
      toast.success('Note deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
