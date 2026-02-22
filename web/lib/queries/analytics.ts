import { useQuery } from '@tanstack/react-query';
import { createApiClient } from '../api';
import { useOrg } from '../org-context';
import type {
  PipelineSummary,
  RevenueVelocity,
  LeadFunnel,
  LostRevenue,
  LeadsBySource,
  LeadsByPath,
  ActionsData,
  RevenueBySource,
} from '@/types';

export interface DashboardData {
  pipeline: PipelineSummary;
  velocity: RevenueVelocity;
  funnel: LeadFunnel[];
  lostRevenue?: LostRevenue;
}

export function useDashboard() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);

  return useQuery({
    queryKey: ['analytics', orgId, 'dashboard'],
    queryFn: async (): Promise<DashboardData> => {
      const [pipeline, velocity, funnel, lostRevenue] = await Promise.all([
        api.get<PipelineSummary>('/analytics/pipeline'),
        api.get<RevenueVelocity>('/analytics/velocity'),
        api.get<LeadFunnel[]>('/analytics/funnel'),
        api.get<LostRevenue>('/analytics/lost-revenue').catch(() => undefined),
      ]);
      return { pipeline, velocity, funnel, lostRevenue };
    },
  });
}

export function usePipeline() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  return useQuery({
    queryKey: ['analytics', orgId, 'pipeline'],
    queryFn: () => api.get<PipelineSummary>('/analytics/pipeline'),
  });
}

export function useLeadsBySource() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  return useQuery({
    queryKey: ['analytics', orgId, 'leads-by-source'],
    queryFn: () => api.get<LeadsBySource[]>('/analytics/leads-by-source'),
  });
}

export function useLeadsByPath() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  return useQuery({
    queryKey: ['analytics', orgId, 'leads-by-path'],
    queryFn: () => api.get<LeadsByPath[]>('/analytics/leads-by-path'),
  });
}

export function useStaleLeads(staleDays = 7) {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  return useQuery({
    queryKey: ['analytics', orgId, 'stale-leads', staleDays],
    queryFn: () => api.get<{ count: number; staleDays: number }>(`/analytics/stale-leads?staleDays=${staleDays}`),
  });
}

export function useActions() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  return useQuery({
    queryKey: ['analytics', orgId, 'actions'],
    queryFn: () => api.get<ActionsData>('/analytics/actions'),
  });
}

export function useRevenueBySource() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  return useQuery({
    queryKey: ['analytics', orgId, 'revenue-by-source'],
    queryFn: () => api.get<RevenueBySource[]>('/analytics/revenue-by-source'),
  });
}
