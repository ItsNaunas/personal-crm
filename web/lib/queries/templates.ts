import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createApiClient } from '../api';
import { useOrg } from '../org-context';
import type { Template } from '@/types';
import toast from 'react-hot-toast';

export function useTemplates() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  return useQuery({
    queryKey: ['templates', orgId],
    queryFn: () => api.get<Template[]>('/templates'),
  });
}

export function useCreateTemplate() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { name: string; body: string; variables?: string[]; outreachChannels?: string[] }) =>
      api.post<Template>('/templates', dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates', orgId] });
      toast.success('Template created');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateTemplate() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string; name?: string; body?: string; variables?: string[]; outreachChannels?: string[] }) =>
      api.patch<Template>(`/templates/${id}`, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates', orgId] });
      toast.success('Template saved');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteTemplate() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/templates/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates', orgId] });
      toast.success('Template deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
