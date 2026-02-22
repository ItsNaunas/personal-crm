import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { createApiClient } from '../api';
import { useOrg } from '../org-context';
import type { Client } from '@/types';
import toast from 'react-hot-toast';

export function useClients() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  return useQuery({
    queryKey: ['clients', orgId],
    queryFn: () => api.get<Client[]>('/clients'),
    refetchInterval: () =>
      typeof document !== 'undefined' && document.visibilityState === 'visible' ? 90_000 : false,
  });
}

export function useClient(id: string) {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  return useQuery({
    queryKey: ['clients', orgId, id],
    queryFn: () => api.get<Client>(`/clients/${id}`),
    enabled: !!id,
    refetchInterval: () =>
      typeof document !== 'undefined' && document.visibilityState === 'visible' ? 90_000 : false,
  });
}

export function useUpdateClientStatus() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      onboardingStatus,
      deliveryStatus,
    }: {
      id: string;
      onboardingStatus?: string;
      deliveryStatus?: string;
    }) => api.patch<Client>(`/clients/${id}/status`, { onboardingStatus, deliveryStatus }),

    onMutate: async ({ id, onboardingStatus, deliveryStatus }) => {
      await qc.cancelQueries({ queryKey: ['clients', orgId, id] });
      const prev = qc.getQueryData<Client>(['clients', orgId, id]);
      qc.setQueryData<Client>(['clients', orgId, id], (old) =>
        old
          ? {
              ...old,
              ...(onboardingStatus !== undefined ? { onboardingStatus } : {}),
              ...(deliveryStatus !== undefined ? { deliveryStatus } : {}),
            }
          : old,
      );
      return { prev };
    },

    onError: (err: Error, { id }, ctx) => {
      if (ctx?.prev) qc.setQueryData(['clients', orgId, id], ctx.prev);
      toast.error(err.message);
    },

    onSettled: (_data, _err, { id }) => {
      qc.invalidateQueries({ queryKey: ['clients', orgId, id] });
      qc.invalidateQueries({ queryKey: ['clients', orgId] });
    },

    onSuccess: (data, { id }) => {
      if (data) {
        qc.setQueryData(['clients', orgId, id], data);
        qc.setQueriesData(
          { queryKey: ['clients', orgId], exact: false },
          (cached: unknown) => {
            if (!Array.isArray(cached)) return cached;
            return cached.map((client: Client) => (client.id === id ? data : client));
          },
        );
      }
      toast.success('Client status updated');
    },
  });
}
