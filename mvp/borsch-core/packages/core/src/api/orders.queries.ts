import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderApi } from '../index';
import { Order, OrderStatus } from '@rms/types';
import { useToastStore } from '../store/useToastStore';

export const orderKeys = {
  all: ['orders'] as const,
  list: () => [...orderKeys.all, 'list'] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
};

export const useOrdersQuery = () => {
  return useQuery({
    queryKey: orderKeys.list(),
    queryFn: orderApi.fetchOrders,
  });
};

export const useUpdateOrderStatusMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: orderApi.updateOrderStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.list() });
    },
    onError: (error: any) => {
      useToastStore.getState().error("Ошибка смены статуса: " + error.message);
    }
  });
};

export const useUpdateOrderMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: orderApi.updateOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.list() });
    },
    onError: (error: any) => {
      useToastStore.getState().error("Ошибка обновления заказа: " + error.message);
    }
  });
};

export const useArchiveOrderMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: orderApi.archiveOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.list() });
    },
    onError: (error: any) => {
      useToastStore.getState().error("Ошибка архивации заказа: " + error.message);
    }
  });
};

export const useDeleteOrderMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: orderApi.deleteOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.list() });
    },
    onError: (error: any) => {
      useToastStore.getState().error("Ошибка удаления заказа: " + error.message);
    }
  });
};
