import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { createApiClient } from '../api';
import { useOrg } from '../org-context';
import type {
  Lead,
  LeadActivity,
  CreateLeadDto,
  UpdateLeadDto,
  LifecycleStage,
  Temperature,
  RecommendedPath,
  NextAction,
  LeadPriority,
} from '@/types';
import toast from 'react-hot-toast';

export interface LeadFilters {
  lifecycleStage?: LifecycleStage | '';
  temperature?: Temperature | '';
  priority?: LeadPriority | '';
  nextAction?: NextAction | '';
  recommendedPath?: RecommendedPath | '';
  platform?: string;
  leadSource?: string;
  q?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface PaginatedLeads {
  data: Lead[];
  total: number;
  page: number;
  pageSize: number;
}

export interface LeadIdsResult {
  ids: string[];
  total: number;
}

function buildLeadListParams(filters?: LeadFilters, includePagination = true): URLSearchParams {
  const params = new URLSearchParams();
  if (filters?.lifecycleStage) params.set('lifecycleStage', filters.lifecycleStage);
  if (filters?.temperature) params.set('temperature', filters.temperature);
  if (filters?.priority) params.set('priority', filters.priority);
  if (filters?.nextAction) params.set('nextAction', filters.nextAction);
  if (filters?.recommendedPath) params.set('recommendedPath', filters.recommendedPath);
  if (filters?.platform) params.set('platform', filters.platform);
  if (filters?.leadSource) params.set('leadSource', filters.leadSource);
  if (filters?.q) params.set('q', filters.q);
  if (filters?.sort) params.set('sort', filters.sort);
  if (filters?.order) params.set('order', filters.order);
  if (includePagination && filters?.page) params.set('page', String(filters.page));
  if (includePagination && filters?.pageSize) params.set('pageSize', String(filters.pageSize));
  return params;
}

export function useLeads(filters?: LeadFilters) {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  const qs = buildLeadListParams(filters, true).toString();

  return useQuery({
    queryKey: ['leads', orgId, filters],
    queryFn: () => api.get<PaginatedLeads>(`/leads${qs ? `?${qs}` : ''}`),
    placeholderData: (prev) => prev,
    refetchInterval: () =>
      typeof document !== 'undefined' && document.visibilityState === 'visible' ? 300_000 : false,
  });
}

export function useLead(id: string) {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  return useQuery({
    queryKey: ['leads', orgId, id],
    queryFn: () => api.get<Lead>(`/leads/${id}`),
    enabled: !!id,
    refetchInterval: () =>
      typeof document !== 'undefined' && document.visibilityState === 'visible' ? 300_000 : false,
  });
}

/** Fetches lead IDs matching the given filters (for "select all matching"). Max 2000 IDs. */
export function useSelectAllMatchingLeads() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  return useMutation({
    mutationFn: async (filters: LeadFilters) => {
      const params = buildLeadListParams(filters, false);
      const result = await api.get<LeadIdsResult>(`/leads/ids${params.toString() ? `?${params.toString()}` : ''}`);
      return result;
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useLeadActivities(id: string) {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  return useQuery({
    queryKey: ['leads', orgId, id, 'activities'],
    queryFn: () => api.get<LeadActivity[]>(`/leads/${id}/activities`),
    enabled: !!id,
  });
}

export function useCreateLead() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateLeadDto) => api.post<Lead>('/leads', dto),
    onSuccess: (data) => {
      if (data) qc.setQueryData(['leads', orgId, data.id], data);
      qc.invalidateQueries({ queryKey: ['leads', orgId] });
      toast.success('Lead created');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

function setLeadInListCache(
  qc: ReturnType<typeof useQueryClient>,
  orgId: string,
  id: string,
  data: Lead,
) {
  qc.setQueryData(['leads', orgId, id], data);
  qc.setQueriesData(
    { queryKey: ['leads', orgId], exact: false },
    (cached: unknown) => {
      if (!cached || typeof cached !== 'object') return cached;
      const c = cached as PaginatedLeads;
      if (!Array.isArray(c.data)) return cached;
      return { ...c, data: c.data.map((lead: Lead) => (lead.id === id ? data : lead)) };
    },
  );
}

export function useUpdateLead() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string } & UpdateLeadDto) =>
      api.patch<Lead>(`/leads/${id}`, dto),
    onSuccess: (data, { id }) => {
      if (data) setLeadInListCache(qc, orgId, id, data);
      qc.invalidateQueries({ queryKey: ['leads', orgId, id] });
      qc.invalidateQueries({ queryKey: ['leads', orgId] });
      toast.success('Profile updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateLeadStage() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: LifecycleStage }) =>
      api.patch<Lead>(`/leads/${id}/stage`, { stage }),

    onMutate: async ({ id, stage }) => {
      await qc.cancelQueries({ queryKey: ['leads', orgId, id] });
      const prev = qc.getQueryData<Lead>(['leads', orgId, id]);
      qc.setQueryData<Lead>(['leads', orgId, id], (old) =>
        old ? { ...old, lifecycleStage: stage } : old,
      );
      return { prev };
    },

    onError: (err: Error, { id }, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(['leads', orgId, id], ctx.prev);
      }
      toast.error(err.message);
    },

    onSettled: (_data, _err, { id }) => {
      qc.invalidateQueries({ queryKey: ['leads', orgId, id] });
      qc.invalidateQueries({ queryKey: ['leads', orgId] });
    },

    onSuccess: (data, { id }) => {
      if (data) setLeadInListCache(qc, orgId, id, data);
      toast.success('Stage updated');
    },
  });
}

export function useUpdateLeadRecommendedPath() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, recommendedPath }: { id: string; recommendedPath: RecommendedPath }) =>
      api.patch<Lead>(`/leads/${id}/recommended-path`, { recommendedPath }),
    onSuccess: (data, { id }) => {
      if (data) setLeadInListCache(qc, orgId, id, data);
      qc.invalidateQueries({ queryKey: ['leads', orgId, id] });
      qc.invalidateQueries({ queryKey: ['leads', orgId] });
      toast.success('Path updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useBulkUpdateLeadStage() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ leadIds, stage }: { leadIds: string[]; stage: LifecycleStage }) =>
      api.patch<{ updated: number }>('/leads/bulk/stage', { leadIds, stage }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads', orgId] });
      toast.success('Stages updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useBulkUpdateLeadPath() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ leadIds, recommendedPath }: { leadIds: string[]; recommendedPath: RecommendedPath }) =>
      api.patch<{ updated: number }>('/leads/bulk/recommended-path', { leadIds, recommendedPath }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads', orgId] });
      toast.success('Paths updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useBulkUpdateLeadTemperature() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ leadIds, temperature }: { leadIds: string[]; temperature: Temperature | null }) =>
      api.patch<{ updated: number }>('/leads/bulk/temperature', { leadIds, temperature }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads', orgId] });
      toast.success('Temperature updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useBulkUpdateLeadPlatform() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ leadIds, platform }: { leadIds: string[]; platform: string | null }) =>
      api.patch<{ updated: number }>('/leads/bulk/platform', { leadIds, platform }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads', orgId] });
      toast.success('Platform updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useBulkUpdateLeadPriority() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ leadIds, priority }: { leadIds: string[]; priority: LeadPriority | null }) =>
      api.patch<{ updated: number }>('/leads/bulk/priority', { leadIds, priority }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads', orgId] });
      toast.success('Priority updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useBulkUpdateLeadSource() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ leadIds, leadSource }: { leadIds: string[]; leadSource: string | null }) =>
      api.patch<{ updated: number }>('/leads/bulk/lead-source', { leadIds, leadSource }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads', orgId] });
      toast.success('Lead source updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useQualifyLead() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.post<Lead>(`/leads/${id}/qualify`, {}),
    onSuccess: (data, id) => {
      if (data) setLeadInListCache(qc, orgId, id, data);
      qc.invalidateQueries({ queryKey: ['leads', orgId, id] });
      qc.invalidateQueries({ queryKey: ['leads', orgId] });
      toast.success('Lead qualification triggered');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useEnrichLead() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.post<Lead>(`/leads/${id}/enrich`, {}),
    onSuccess: (data, id) => {
      if (data) setLeadInListCache(qc, orgId, id, data);
      qc.invalidateQueries({ queryKey: ['leads', orgId, id] });
      qc.invalidateQueries({ queryKey: ['leads', orgId] });
      toast.success('Lead enrichment triggered');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateLeadNextAction() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, nextAction, nextActionDue }: { id: string; nextAction?: NextAction | null; nextActionDue?: string | null }) =>
      api.patch<Lead>(`/leads/${id}/next-action`, { nextAction, nextActionDue }),
    onSuccess: (data, { id }) => {
      if (data) setLeadInListCache(qc, orgId, id, data);
      qc.invalidateQueries({ queryKey: ['leads', orgId, id] });
      qc.invalidateQueries({ queryKey: ['leads', orgId] });
      qc.invalidateQueries({ queryKey: ['analytics', orgId, 'actions'] });
      toast.success('Next action updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateLeadPriority() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, priority }: { id: string; priority?: LeadPriority | null }) =>
      api.patch<Lead>(`/leads/${id}/priority`, { priority }),
    onSuccess: (data, { id }) => {
      if (data) setLeadInListCache(qc, orgId, id, data);
      qc.invalidateQueries({ queryKey: ['leads', orgId, id] });
      qc.invalidateQueries({ queryKey: ['leads', orgId] });
      toast.success('Priority updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateLeadTemperature() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, temperature }: { id: string; temperature?: Temperature | null }) =>
      api.patch<Lead>(`/leads/${id}/temperature`, { temperature }),
    onSuccess: (data, { id }) => {
      if (data) setLeadInListCache(qc, orgId, id, data);
      qc.invalidateQueries({ queryKey: ['leads', orgId, id] });
      qc.invalidateQueries({ queryKey: ['leads', orgId] });
      toast.success('Temperature updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useMergeLeads() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ masterId, duplicateId }: { masterId: string; duplicateId: string }) =>
      api.post<Lead>('/leads/merge', { masterId, duplicateId }),
    onSuccess: (data, { masterId, duplicateId }) => {
      if (data) {
        setLeadInListCache(qc, orgId, masterId, data);
        qc.setQueriesData(
          { queryKey: ['leads', orgId], exact: false },
          (cached: unknown) => {
            if (!cached || typeof cached !== 'object') return cached;
            const c = cached as PaginatedLeads;
            if (!Array.isArray(c.data)) return cached;
            return { ...c, data: c.data.filter((lead: Lead) => lead.id !== duplicateId), total: Math.max(0, c.total - 1) };
          },
        );
      }
      qc.invalidateQueries({ queryKey: ['leads', orgId] });
      toast.success('Leads merged');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useBulkDeleteLeads() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (leadIds: string[]) =>
      api.delete<{ deleted: number; skipped: number }>('/leads/bulk', { leadIds }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['leads', orgId] });
      if (data.skipped > 0) {
        toast.success(`Deleted ${data.deleted} lead(s). ${data.skipped} skipped (have related records).`);
      } else {
        toast.success(`Deleted ${data.deleted} lead(s)`);
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteLead() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  const qc = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/leads/${id}`),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['leads', orgId] });
      qc.removeQueries({ queryKey: ['leads', orgId, id] });
      toast.success('Lead deleted');
      router.push('/leads');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
