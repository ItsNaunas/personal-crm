import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createApiClient } from '../api';
import { useOrg } from '../org-context';
import type { IntakeFormBody, IntakeLeadPayload } from '@/types';
import toast from 'react-hot-toast';

export function useIntakeForm() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: IntakeFormBody | IntakeLeadPayload) =>
      api.post<{ accepted: boolean; id: string | null }>('/intake/form', body),
    onSuccess: (data) => {
      if (data.accepted) {
        toast.success('Lead intake accepted');
        qc.invalidateQueries({ queryKey: ['leads', orgId] });
      } else {
        toast.error('Lead was rejected (possible duplicate)');
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useIntakeCsv() {
  const { orgId } = useOrg();
  const api = createApiClient(orgId);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (leads: IntakeLeadPayload[]) =>
      api.post<{ accepted: number; rejected: number }>('/intake/csv', { leads }),
    onSuccess: () => {
      toast.success('CSV leads submitted');
      qc.invalidateQueries({ queryKey: ['leads', orgId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
