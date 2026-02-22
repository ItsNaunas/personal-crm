import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { createApiClient } from '../api';
import { useOrg } from '../org-context';
import type { Call, CreateCallDto, CompleteCallDto, CallStatus } from '@/types';
import toast from 'react-hot-toast';

export function useCalls(statusFilter?: CallStatus | '') {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  return useQuery({
    queryKey: ['calls', orgId, statusFilter],
    queryFn: async () => {
      const data = await api.get<Call[]>('/calls');
      if (statusFilter) return data.filter((c) => c.status === statusFilter);
      return data;
    },
    refetchInterval: () =>
      typeof document !== 'undefined' && document.visibilityState === 'visible' ? 90_000 : false,
  });
}

export function useCall(id: string) {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  return useQuery({
    queryKey: ['calls', orgId, id],
    queryFn: () => api.get<Call>(`/calls/${id}`),
    enabled: !!id,
    refetchInterval: () =>
      typeof document !== 'undefined' && document.visibilityState === 'visible' ? 90_000 : false,
  });
}

export function useBookCall() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateCallDto) => api.post<Call>('/calls', dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calls', orgId] });
      toast.success('Call booked');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useCompleteCall() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: CompleteCallDto }) =>
      api.patch<Call>(`/calls/${id}/complete`, dto),

    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: ['calls', orgId, id] });
      const prev = qc.getQueryData<Call>(['calls', orgId, id]);
      qc.setQueryData<Call>(['calls', orgId, id], (old) =>
        old ? { ...old, status: 'completed' as CallStatus } : old,
      );
      return { prev };
    },

    onError: (err: Error, { id }, ctx) => {
      if (ctx?.prev) qc.setQueryData(['calls', orgId, id], ctx.prev);
      toast.error(err.message);
    },

    onSettled: (_data, _err, { id }) => {
      qc.invalidateQueries({ queryKey: ['calls', orgId, id] });
      qc.invalidateQueries({ queryKey: ['calls', orgId] });
    },

    onSuccess: (data, { id }) => {
      if (data) {
        qc.setQueryData(['calls', orgId, id], data);
        qc.setQueriesData(
          { queryKey: ['calls', orgId], exact: false },
          (cached: unknown) => {
            if (!Array.isArray(cached)) return cached;
            return cached.map((call: Call) => (call.id === id ? data : call));
          },
        );
      }
      toast.success('Call marked as completed');
    },
  });
}

export function useNoShowCall() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.patch<Call>(`/calls/${id}/no-show`),

    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['calls', orgId, id] });
      const prev = qc.getQueryData<Call>(['calls', orgId, id]);
      qc.setQueryData<Call>(['calls', orgId, id], (old) =>
        old ? { ...old, status: 'no_show' as CallStatus } : old,
      );
      return { prev };
    },

    onError: (err: Error, id, ctx) => {
      if (ctx?.prev) qc.setQueryData(['calls', orgId, id], ctx.prev);
      toast.error(err.message);
    },

    onSettled: (_data, _err, id) => {
      qc.invalidateQueries({ queryKey: ['calls', orgId, id] });
      qc.invalidateQueries({ queryKey: ['calls', orgId] });
    },

    onSuccess: (data, id) => {
      if (data) {
        qc.setQueryData(['calls', orgId, id], data);
        qc.setQueriesData(
          { queryKey: ['calls', orgId], exact: false },
          (cached: unknown) => {
            if (!Array.isArray(cached)) return cached;
            return cached.map((call: Call) => (call.id === id ? data : call));
          },
        );
      }
      toast.success('Call marked as no-show');
    },
  });
}
