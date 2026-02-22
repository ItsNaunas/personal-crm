import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createApiClient } from '../api';
import { useOrg } from '../org-context';
import type { Tag } from '@/types';
import toast from 'react-hot-toast';

export function useTags() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  return useQuery({
    queryKey: ['tags', orgId],
    queryFn: () => api.get<Tag[]>('/tags'),
  });
}

export function useLeadTags(leadId: string) {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  return useQuery({
    queryKey: ['tags', orgId, 'lead', leadId],
    queryFn: () => api.get<Tag[]>(`/tags/leads/${leadId}`),
    enabled: !!leadId,
  });
}

export function useDealTags(dealId: string) {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  return useQuery({
    queryKey: ['tags', orgId, 'deal', dealId],
    queryFn: () => api.get<Tag[]>(`/tags/deals/${dealId}`),
    enabled: !!dealId,
  });
}

export function useCreateTag() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { name: string; color?: string }) => api.post<Tag>('/tags', dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tags', orgId] });
      toast.success('Tag created');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteTag() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/tags/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tags', orgId] });
      toast.success('Tag deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useAddLeadTag() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, tagId }: { leadId: string; tagId: string }) =>
      api.post(`/tags/leads/${leadId}`, { tagId }),
    onSuccess: (_, { leadId }) => {
      qc.invalidateQueries({ queryKey: ['tags', orgId, 'lead', leadId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useRemoveLeadTag() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, tagId }: { leadId: string; tagId: string }) =>
      api.delete(`/tags/leads/${leadId}/${tagId}`),
    onSuccess: (_, { leadId }) => {
      qc.invalidateQueries({ queryKey: ['tags', orgId, 'lead', leadId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useAddDealTag() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dealId, tagId }: { dealId: string; tagId: string }) =>
      api.post(`/tags/deals/${dealId}`, { tagId }),
    onSuccess: (_, { dealId }) => {
      qc.invalidateQueries({ queryKey: ['tags', orgId, 'deal', dealId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useRemoveDealTag() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dealId, tagId }: { dealId: string; tagId: string }) =>
      api.delete(`/tags/deals/${dealId}/${tagId}`),
    onSuccess: (_, { dealId }) => {
      qc.invalidateQueries({ queryKey: ['tags', orgId, 'deal', dealId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
