import { pb } from '../pocketbase';

export interface ClientRecord {
  id: string;
  name: string;
  phone: string;
  address: string;
  created: string;
  orders_count?: number;
}

export class ClientsRepository {
  static async fetchAll(): Promise<ClientRecord[]> {
    const records = await pb.collection('clients').getFullList({
      sort: '-created',
    });
    return records.map(r => ({
      id: r.id,
      name: r.name,
      phone: r.phone,
      address: r.address,
      created: r.created,
      orders_count: r.orders_count || 0
    })) as ClientRecord[];
  }

  static async getById(id: string): Promise<ClientRecord> {
    return await pb.collection('clients').getOne(id);
  }

  static async add(payload: Partial<ClientRecord>): Promise<void> {
    await pb.collection('clients').create(payload);
  }

  static async update(id: string, payload: Partial<ClientRecord>): Promise<void> {
    await pb.collection('clients').update(id, payload);
  }

  static async delete(id: string): Promise<void> {
    // 1. Get the client to get their phone
    const client = await this.getById(id);
    if (!client || !client.phone) {
      await pb.collection('clients').delete(id);
      return;
    }

    // 2. Find all orders with this phone
    const orders = await pb.collection('orders').getFullList({
      filter: pb.filter('customer_phone = {:phone}', { phone: client.phone }),
    });

    // 3. Delete all order items and orders
    for (const order of orders) {
      // Find items for this order
      const items = await pb.collection('order_items').getFullList({
        filter: pb.filter('order_id = {:id}', { id: order.id }),
      });
      
      // Delete items
      for (const item of items) {
        await pb.collection('order_items').delete(item.id);
      }
      
      // Delete order
      await pb.collection('orders').delete(order.id);
    }

    // 4. Finally delete the client
    await pb.collection('clients').delete(id);
  }
}
