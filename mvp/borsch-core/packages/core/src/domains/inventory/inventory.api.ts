import { InventoryItem, InventoryCategory, Supplier, SupplierOrder } from '@rms/types';
import { API_URL } from '../../config';

export const fetchInventory = async (): Promise<InventoryItem[]> => {
  const res = await fetch(`${API_URL}/inventory`);
  if (!res.ok) throw new Error('Failed to fetch inventory');
  return res.json();
};

export const fetchInventoryCategories = async (): Promise<InventoryCategory[]> => {
  const res = await fetch(`${API_URL}/inventory/categories`);
  if (!res.ok) throw new Error('Failed to fetch categories');
  return res.json();
};

export const createInventoryItem = async (data: Partial<InventoryItem>): Promise<InventoryItem> => {
  const res = await fetch(`${API_URL}/inventory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create item');
  return res.json();
};

export const updateInventoryItem = async (id: string, data: Partial<InventoryItem>): Promise<InventoryItem> => {
  const res = await fetch(`${API_URL}/inventory/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update item');
  return res.json();
};

export const deleteInventoryItem = async (id: string): Promise<void> => {
  const res = await fetch(`${API_URL}/inventory/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete item');
};

export const createInventoryCategory = async (data: { name: string }): Promise<InventoryCategory> => {
  const res = await fetch(`${API_URL}/inventory/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create category');
  return res.json();
};

export const deleteInventoryCategory = async (id: string): Promise<void> => {
  const res = await fetch(`${API_URL}/inventory/categories/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete category');
};

export const fetchSuppliers = async (): Promise<Supplier[]> => {
  const res = await fetch(`${API_URL}/suppliers`);
  if (!res.ok) throw new Error('Failed to fetch suppliers');
  return res.json();
};

export const createSupplier = async (data: Partial<Supplier>): Promise<Supplier> => {
  const res = await fetch(`${API_URL}/suppliers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create supplier');
  return res.json();
};

export const deleteSupplier = async (id: string): Promise<void> => {
  const res = await fetch(`${API_URL}/suppliers/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete supplier');
};

export const fetchSupplierOrders = async (): Promise<SupplierOrder[]> => {
  const res = await fetch(`${API_URL}/suppliers/orders`);
  if (!res.ok) throw new Error('Failed to fetch supplier orders');
  return res.json();
};

export const createSupplierOrder = async (data: any): Promise<SupplierOrder> => {
  const res = await fetch(`${API_URL}/suppliers/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create order');
  return res.json();
};

export const deleteSupplierOrder = async (id: string): Promise<void> => {
  const res = await fetch(`${API_URL}/suppliers/orders/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete order');
};


