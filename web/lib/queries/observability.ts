import { useQuery } from '@tanstack/react-query';
import { createApiClient } from '../api';
import { useOrg } from '../org-context';
import type { Job, DeadLetterJob, CronTask } from '@/types';

export function usePendingJobs() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  return useQuery({
    queryKey: ['observability', orgId, 'pending'],
    queryFn: () => api.get<Job[]>('/observability/jobs/pending'),
    refetchInterval: 10_000,
  });
}

export function useRunningJobs() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  return useQuery({
    queryKey: ['observability', orgId, 'running'],
    queryFn: () => api.get<Job[]>('/observability/jobs/running'),
    refetchInterval: 5_000,
  });
}

export function useFailedJobs() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  return useQuery({
    queryKey: ['observability', orgId, 'failed'],
    queryFn: () => api.get<Job[]>('/observability/jobs/failed'),
    refetchInterval: 30_000,
  });
}

export function useDeadLetterJobs() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  return useQuery({
    queryKey: ['observability', orgId, 'dead-letter'],
    queryFn: () => api.get<DeadLetterJob[]>('/observability/jobs/dead-letter'),
    refetchInterval: 60_000,
  });
}

export function useUpcomingCronTasks() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  return useQuery({
    queryKey: ['observability', orgId, 'cron'],
    queryFn: () => api.get<CronTask[]>('/observability/scheduler/upcoming'),
    refetchInterval: 60_000,
  });
}
