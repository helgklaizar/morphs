import { InventoryItem, Supplier, SupplierOrder } from '@rms/types';

const API_URL = 'http://localhost:3002/api';

export const fetchInventory = async (): Promise<InventoryItem[]> => {
  const res = await fetch(`${API_URL}/inventory`);
  if (!res.ok) throw new Error('Failed to fetch inventory');
  const records = await res.json();
  
  return records.map((r: any) => ({
    id: r.id,
    name: r.name,
    unit: r.unit,
    stock: r.stock,
    costPerUnit: r.costPerUnit,
    minStock: r.minStock,
  })) as InventoryItem[];
};

export const fetchSuppliers = async (): Promise<Supplier[]> => {
  const res = await fetch(`${API_URL}/suppliers`);
  if (!res.ok) throw new Error('Failed to fetch suppliers');
  return res.json();
};

export const fetchSupplierOrders = async (): Promise<SupplierOrder[]> => {
  const res = await fetch(`${API_URL}/suppliers/orders`);
  if (!res.ok) throw new Error('Failed to fetch supplier orders');
  return res.json();
};
