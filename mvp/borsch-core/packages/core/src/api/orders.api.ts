import { pb } from '@rms/db-local';
import { Order, OrderStatus } from '@rms/types';

export const fetchOrders = async (): Promise<Order[]> => {
  const records = await pb.collection('orders').getFullList({
    filter: 'status != "completed"',
    sort: '-created'
  });

  const orderIds = records.map(r => r.id);
  let orderItems: any[] = [];
  if (orderIds.length > 0) {
    const chunks = [];
    for (let i = 0; i < orderIds.length; i += 40) {
       const chunk = orderIds.slice(i, i+40).map(id => `order_id='${id}'`).join(' || ');
       if (chunk) {
           chunks.push(pb.collection('order_items').getFullList({ filter: chunk }));
       }
    }
    const results = await Promise.all(chunks);
    orderItems = results.flat();
  }

  return records.map(r => ({
    id: r.id, 
    customerName: r.customer_name || '', 
    customerPhone: r.customer_phone || '',
    status: (r.status?.toLowerCase() as OrderStatus) || 'new', 
    totalAmount: r.total_amount || 0, 
    createdAt: r.created,
    reservationDate: r.reservation_date || '',
    paymentMethod: r.payment_method || 'cash',
    isArchived: r.is_archived === 1,
    tableId: r.table_id || undefined,
    items: orderItems.filter(item => item.order_id === r.id).map(item => ({
         id: item.id,
         menuItemId: item.menu_item_id,
         menuItemName: item.menu_item_name,
         quantity: item.quantity,
         price: item.price_at_time
    }))
  })) as any[];
};

export const updateOrderStatus = async ({ id, status }: { id: string, status: OrderStatus }) => {
  return await pb.collection('orders').update(id, { status });
};

export const updateOrder = async ({ id, payload }: { id: string, payload: Partial<Order> }) => {
  return await pb.collection('orders').update(id, payload);
};

export const archiveOrder = async (id: string) => {
  return await pb.collection('orders').update(id, { is_archived: 1 });
};

export const deleteOrder = async (id: string) => {
  return await pb.collection('orders').delete(id);
};
