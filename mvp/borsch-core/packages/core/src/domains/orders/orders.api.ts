import { Order, OrderStatus } from '@rms/types';

const API_URL = 'http://localhost:3002/api';

export const fetchOrders = async (): Promise<Order[]> => {
  const res = await fetch(`${API_URL}/orders`);
  if (!res.ok) throw new Error('Failed to fetch orders');
  const records = await res.json();
  
  return records.map((r: any) => ({
    id: r.id, 
    customerName: r.customerName || '', 
    customerPhone: r.customerPhone || '',
    status: r.status as OrderStatus || 'new', 
    totalAmount: r.totalAmount || 0, 
    createdAt: r.createdAt,
    reservationDate: r.reservationDate || '',
    paymentMethod: r.paymentMethod || 'cash',
    isArchived: r.isArchived,
    tableId: r.tableId,
    clientId: r.clientId,
    items: (r.items || []).map((item: any) => ({
         id: item.id,
         menuItemId: item.menuItemId,
         menuItemName: item.menuItemName,
         quantity: item.quantity,
         price: item.priceAtTime
    }))
  })) as Order[];
};

export const createOrder = async (payload: Partial<Order>) => {
  return fetch(`${API_URL}/orders`, {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify(payload)
  }).then(r => r.json());
};

export const updateOrderStatus = async ({ id, status }: { id: string, status: OrderStatus }) => {
  return fetch(`${API_URL}/orders/${id}/status`, {
     method: 'PATCH',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ status })
  }).then(r => r.json());
};

export const updateOrder = async ({ id, payload }: { id: string, payload: Partial<Order> }) => {
  return fetch(`${API_URL}/orders/${id}`, {
     method: 'PATCH',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify(payload)
  }).then(r => r.json());
};

export const archiveOrder = async (id: string) => {
  return fetch(`${API_URL}/orders/${id}`, {
     method: 'PATCH',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ isArchived: true })
  }).then(r => r.json());
};

export const deleteOrder = async (id: string) => {
  return fetch(`${API_URL}/orders/${id}`, { method: 'DELETE' }).then(r => r.json());
};
