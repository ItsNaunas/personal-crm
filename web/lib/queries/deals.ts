import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { createApiClient } from '../api';
import { useOrg } from '../org-context';
import type { Deal, CreateDealDto, UpdateDealStageDto, UpdateDealDto } from '@/types';
import toast from 'react-hot-toast';

export function useDeals() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  return useQuery({
    queryKey: ['deals', orgId],
    queryFn: () => api.get<Deal[]>('/deals'),
    refetchInterval: () =>
      typeof document !== 'undefined' && document.visibilityState === 'visible' ? 90_000 : false,
  });
}

export function useDeal(id: string) {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  return useQuery({
    queryKey: ['deals', orgId, id],
    queryFn: () => api.get<Deal>(`/deals/${id}`),
    enabled: !!id,
    refetchInterval: () =>
      typeof document !== 'undefined' && document.visibilityState === 'visible' ? 90_000 : false,
  });
}

export function useCreateDeal() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateDealDto) => api.post<Deal>('/deals', dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deals', orgId] });
      toast.success('Deal created');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateDealStage() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateDealStageDto }) =>
      api.patch<Deal>(`/deals/${id}/stage`, dto),

    onMutate: async ({ id, dto }) => {
      await qc.cancelQueries({ queryKey: ['deals', orgId, id] });
      const prev = qc.getQueryData<Deal>(['deals', orgId, id]);
      qc.setQueryData<Deal>(['deals', orgId, id], (old) =>
        old ? { ...old, stage: dto.stage } : old,
      );
      return { prev };
    },

    onError: (err: Error, { id }, ctx) => {
      if (ctx?.prev) qc.setQueryData(['deals', orgId, id], ctx.prev);
      toast.error(err.message);
    },

    onSettled: (_data, _err, { id }) => {
      qc.invalidateQueries({ queryKey: ['deals', orgId, id] });
      qc.invalidateQueries({ queryKey: ['deals', orgId] });
      qc.invalidateQueries({ queryKey: ['analytics', orgId] });
    },

    onSuccess: (data, { id }) => {
      if (data) {
        qc.setQueryData(['deals', orgId, id], data);
        qc.setQueriesData(
          { queryKey: ['deals', orgId], exact: false },
          (cached: unknown) => {
            if (!Array.isArray(cached)) return cached;
            return cached.map((deal: Deal) => (deal.id === id ? data : deal));
          },
        );
      }
      toast.success('Deal stage updated');
    },
  });
}

export function useUpdateDeal() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateDealDto }) =>
      api.patch<Deal>(`/deals/${id}`, dto),

    onMutate: async ({ id, dto }) => {
      await qc.cancelQueries({ queryKey: ['deals', orgId, id] });
      const prev = qc.getQueryData<Deal>(['deals', orgId, id]);
      qc.setQueryData<Deal>(['deals', orgId, id], (old) =>
        old ? { ...old, ...dto } : old,
      );
      return { prev };
    },

    onError: (err: Error, { id }, ctx) => {
      if (ctx?.prev) qc.setQueryData(['deals', orgId, id], ctx.prev);
      toast.error(err.message);
    },

    onSettled: (_data, _err, { id }) => {
      qc.invalidateQueries({ queryKey: ['deals', orgId, id] });
      qc.invalidateQueries({ queryKey: ['deals', orgId] });
    },

    onSuccess: (data, { id }) => {
      if (data) {
        qc.setQueryData(['deals', orgId, id], data);
        qc.setQueriesData(
          { queryKey: ['deals', orgId], exact: false },
          (cached: unknown) => {
            if (!Array.isArray(cached)) return cached;
            return cached.map((deal: Deal) => (deal.id === id ? data : deal));
          },
        );
      }
      toast.success('Deal updated');
    },
  });
}
