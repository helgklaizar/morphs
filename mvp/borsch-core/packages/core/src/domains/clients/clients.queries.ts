import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchClients, createClient } from './clients.api';
import { Client } from '@rms/types';

export const clientKeys = {
  all: ['clients'] as const,
};

export function useClientsQuery() {
  return useQuery<Client[], Error>({
    queryKey: clientKeys.all,
    queryFn: fetchClients,
  });
}

export function useCreateClientMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createClient,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clientKeys.all })
  });
}
