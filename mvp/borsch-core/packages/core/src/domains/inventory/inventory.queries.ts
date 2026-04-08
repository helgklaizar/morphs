import { useQuery } from '@tanstack/react-query';
import { fetchInventory, fetchSuppliers, fetchSupplierOrders } from './inventory.api';
import { InventoryItem, Supplier, SupplierOrder } from '@rms/types';

export const inventoryKeys = {
  all: ['inventory'] as const,
  suppliers: ['suppliers'] as const,
  supplierOrders: ['supplierOrders'] as const,
};

export function useInventoryQuery() {
  return useQuery<InventoryItem[], Error>({
    queryKey: inventoryKeys.all,
    queryFn: fetchInventory,
  });
}

export function useSuppliersQuery() {
  return useQuery<Supplier[], Error>({
    queryKey: inventoryKeys.suppliers,
    queryFn: fetchSuppliers,
  });
}

export function useSupplierOrdersQuery() {
  return useQuery<SupplierOrder[], Error>({
    queryKey: inventoryKeys.supplierOrders,
    queryFn: fetchSupplierOrders,
  });
}
