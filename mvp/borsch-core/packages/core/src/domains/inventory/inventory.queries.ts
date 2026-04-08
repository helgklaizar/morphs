import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from './inventory.api';
import { InventoryItem, InventoryCategory, Supplier, SupplierOrder } from '@rms/types';

export const inventoryKeys = {
  all: ['inventory'] as const,
  categories: ['inventory_categories'] as const,
  suppliers: ['suppliers'] as const,
  supplierOrders: ['supplierOrders'] as const,
};

export function useInventoryQuery() {
  return useQuery<InventoryItem[], Error>({
    queryKey: inventoryKeys.all,
    queryFn: api.fetchInventory,
  });
}

export function useInventoryCategoriesQuery() {
  return useQuery<InventoryCategory[], Error>({
    queryKey: inventoryKeys.categories,
    queryFn: api.fetchInventoryCategories,
  });
}

export function useCreateInventoryItemMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createInventoryItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
    },
  });
}

export function useUpdateInventoryItemMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InventoryItem> }) => 
      api.updateInventoryItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
    },
  });
}

export function useDeleteInventoryItemMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deleteInventoryItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
    },
  });
}

export function useCreateInventoryCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createInventoryCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.categories });
    },
  });
}

export function useDeleteInventoryCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deleteInventoryCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.categories });
    },
  });
}

export function useSuppliersQuery() {
  return useQuery<Supplier[], Error>({
    queryKey: inventoryKeys.suppliers,
    queryFn: api.fetchSuppliers,
  });
}

export function useCreateSupplierMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.suppliers });
    },
  });
}

export function useDeleteSupplierMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deleteSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.suppliers });
    },
  });
}

export function useSupplierOrdersQuery() {
  return useQuery<SupplierOrder[], Error>({
    queryKey: inventoryKeys.supplierOrders,
    queryFn: api.fetchSupplierOrders,
  });
}

export function useCreateSupplierOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createSupplierOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.supplierOrders });
    },
  });
}

export function useDeleteSupplierOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deleteSupplierOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.supplierOrders });
    },
  });
}


