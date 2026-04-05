import { pb } from '../pocketbase';
import { Order, OrderStatus } from '@/store/useOrdersStore';

export class HistoryRepository {
  static async fetchHistory(): Promise<Order[]> {
    const records = await pb.collection('orders').getFullList({
      filter: 'is_archived = true',
      sort: '-created',
    });

    if (records.length === 0) return [];

    const orderIds = records.map(r => `order_id="${r.id}"`).join(' || ');
    let orderItems: any[] = [];
    if (orderIds.length > 0) {
       orderItems = await pb.collection('order_items').getFullList({
         filter: orderIds
       });
    }

    return records.map((row: any) => {
      const items = orderItems.filter(i => i.order_id === row.id).map((item: any) => ({
        id: item.id,
        menuItemName: item.menu_item_name || '',
        quantity: item.quantity || 1,
        priceAtTime: item.price_at_time || 0,
        menuItemId: item.menu_item_id || null,
      }));

      return {
        id: row.id,
        customerName: row.customer_name || '',
        customerPhone: row.customer_phone || '',
        status: (row.status?.toLowerCase() as OrderStatus) || 'new',
        totalAmount: row.total_amount || 0,
        createdAt: row.created,
        reservationDate: row.reservation_date || '',
        paymentMethod: row.payment_method || 'cash',
        isArchived: row.is_archived === 1,
        items
      };
    });
  }
}
