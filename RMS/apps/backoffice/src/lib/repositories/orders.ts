import { pb } from '../pocketbase';
import { Order, OrderItem, OrderStatus } from '@rms/types';

export class OrdersRepository {
  static async fetchAll(): Promise<Order[]> {
    const records = await pb.collection('orders').getFullList({
      filter: 'is_archived = false',
      sort: '-created',
    });

    if (records.length === 0) return [];

    const orderItems: any[] = [];
    if (records.length > 0) {
      const chunkSize = 30;
      for (let i = 0; i < records.length; i += chunkSize) {
        const chunk = records.slice(i, i + chunkSize);
        const filterStr = chunk.map(r => `order_id="${r.id}"`).join(' || ');
        const chunkItems = await pb.collection('order_items').getFullList({ filter: filterStr });
        orderItems.push(...chunkItems);
      }
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
        tableId: row.table_id || undefined,
        items
      };
    });
  }

  static async updateStatus(id: string, status: OrderStatus): Promise<void> {
    await pb.collection('orders').update(id, { status });
  }

  static async updateFields(id: string, payload: Partial<Order>): Promise<void> {
    const updateData: Record<string, any> = {};
    if (payload.customerName !== undefined) updateData.customer_name = payload.customerName;
    if (payload.customerPhone !== undefined) updateData.customer_phone = payload.customerPhone;
    if (payload.paymentMethod !== undefined) updateData.payment_method = payload.paymentMethod;
    if (payload.totalAmount !== undefined) updateData.total_amount = payload.totalAmount;
    if (payload.reservationDate !== undefined) updateData.reservation_date = payload.reservationDate;
    if (payload.tableId !== undefined) updateData.table_id = payload.tableId;
    
    await pb.collection('orders').update(id, updateData);
  }

  static async create(payload: Partial<Order>): Promise<Order> {
    const record = await pb.collection('orders').create({
      customer_name: payload.customerName || "Гость",
      customer_phone: payload.customerPhone || "",
      status: payload.status || "new",
      total_amount: payload.totalAmount || 0,
      payment_method: payload.paymentMethod || "cash",
      table_id: payload.tableId || null,
      is_archived: false,
    });
    return {
      ...payload,
      id: record.id,
      createdAt: record.created,
      status: record.status as OrderStatus,
      items: [],
      isArchived: false,
    } as Order;
  }

  static async createItem(orderId: string, item: OrderItem): Promise<void> {
    await pb.collection('order_items').create({
      order_id: orderId,
      menu_item_id: item.menuItemId,
      menu_item_name: item.menuItemName,
      quantity: item.quantity,
      price_at_time: item.priceAtTime
    });
  }

  static async delete(id: string): Promise<void> {
    await pb.collection('orders').delete(id);
  }


  static async archive(id: string): Promise<void> {
    await pb.collection('orders').update(id, { is_archived: true });
  }
}
