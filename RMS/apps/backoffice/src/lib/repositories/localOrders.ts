import { Order, OrderItem, OrderStatus } from '@rms/types';

const generateId = () => Math.random().toString(36).substring(2, 17);

const recordOutboxEvent = async (db: any, action: string, payload: any) => {
  const id = generateId();
  await db.execute(
    `INSERT INTO outbox_events (id, entity_type, action, payload_json, status) VALUES ($1, $2, $3, $4, $5)`,
    [id, 'orders', action, JSON.stringify(payload), 'pending']
  );
};

export class LocalOrdersRepository {
  static async fetchAll(): Promise<Order[]> {
    const { getDb } = await import('@rms/db-local');
    const db = await getDb();

    // Fetch all active orders
    const ordersRaw = await db.select<any[]>(`SELECT * FROM orders WHERE is_archived = 0 ORDER BY created_at DESC`);
    
    if (ordersRaw.length === 0) return [];

    const orderIds = ordersRaw.map(o => `'${o.id}'`).join(',');
    const itemsRaw = await db.select<any[]>(`SELECT * FROM order_items WHERE order_id IN (\${orderIds})`);

    return ordersRaw.map(row => {
      const items = itemsRaw.filter(i => i.order_id === row.id).map(item => ({
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
        createdAt: row.created_at || new Date().toISOString(),
        reservationDate: row.reservation_date || '',
        paymentMethod: row.payment_method || 'cash',
        isArchived: row.is_archived === 1,
        tableId: row.table_id || undefined,
        items
      };
    });
  }

  static async fetchById(id: string): Promise<Order | null> {
    const { getDb } = await import('@rms/db-local');
    const db = await getDb();
    const rows = await db.select<any[]>(`SELECT * FROM orders WHERE id = $1`, [id]);
    if(rows.length === 0) return null;
    const row = rows[0];
    const itemsRaw = await db.select<any[]>(`SELECT * FROM order_items WHERE order_id = $1`, [id]);
    
    return {
      id: row.id,
      customerName: row.customer_name || '',
      customerPhone: row.customer_phone || '',
      status: (row.status?.toLowerCase() as OrderStatus) || 'new',
      totalAmount: row.total_amount || 0,
      createdAt: row.created_at || new Date().toISOString(),
      reservationDate: row.reservation_date || '',
      paymentMethod: row.payment_method || 'cash',
      isArchived: row.is_archived === 1,
      tableId: row.table_id || undefined,
      items: itemsRaw.map(item => ({
        id: item.id,
        menuItemName: item.menu_item_name || '',
        quantity: item.quantity || 1,
        priceAtTime: item.price_at_time || 0,
        menuItemId: item.menu_item_id || null,
      }))
    };
  }

  static async updateStatus(id: string, status: OrderStatus): Promise<void> {
    const { getDb } = await import('@rms/db-local');
    const db = await getDb();
    await db.execute(`UPDATE orders SET status=$1 WHERE id=$2`, [status, id]);
    
    const order = await this.fetchById(id);
    if(order) await recordOutboxEvent(db, 'sync_order', order);
  }

  static async updateFields(id: string, payload: Partial<Order>): Promise<void> {
    const { getDb } = await import('@rms/db-local');
    const db = await getDb();
    
    // Convert to flat updates
    const updates: string[] = [];
    const values: any[] = [];
    let counter = 1;

    if (payload.customerName !== undefined) { updates.push(`customer_name = $\${counter++}`); values.push(payload.customerName); }
    if (payload.customerPhone !== undefined) { updates.push(`customer_phone = $\${counter++}`); values.push(payload.customerPhone); }
    if (payload.paymentMethod !== undefined) { updates.push(`payment_method = $\${counter++}`); values.push(payload.paymentMethod); }
    if (payload.totalAmount !== undefined) { updates.push(`total_amount = $\${counter++}`); values.push(payload.totalAmount); }
    if (payload.reservationDate !== undefined) { updates.push(`reservation_date = $\${counter++}`); values.push(payload.reservationDate); }
    
    if (updates.length > 0) {
      values.push(id);
      await db.execute(`UPDATE orders SET \${updates.join(', ')} WHERE id = $\${counter}`, values);
    }
    
    const order = await this.fetchById(id);
    if(order) await recordOutboxEvent(db, 'sync_order', order);
  }

  static async create(payload: Partial<Order>): Promise<Order> {
    const { getDb } = await import('@rms/db-local');
    const db = await getDb();
    const id = generateId();
    const createdAt = new Date().toISOString();
    
    await db.execute(
      `INSERT INTO orders (id, customer_name, customer_phone, status, total_amount, payment_method, is_archived, created_at, sync_status) 
       VALUES ($1, $2, $3, $4, $5, $6, 0, $7, 'pending')`,
      [
        id, 
        payload.customerName || "Гость", 
        payload.customerPhone || "", 
        payload.status || "new", 
        payload.totalAmount || 0, 
        payload.paymentMethod || "cash",
        createdAt
      ]
    );

    const newOrder: Order = {
      ...(payload as any),
      id,
      createdAt,
      status: (payload.status || 'new') as OrderStatus,
      items: [],
      isArchived: false,
    };
    
    await recordOutboxEvent(db, 'sync_order', newOrder);
    return newOrder;
  }

  static async createItem(orderId: string, item: OrderItem): Promise<void> {
    const { getDb } = await import('@rms/db-local');
    const db = await getDb();
    const id = generateId();
    
    await db.execute(
      `INSERT INTO order_items (id, order_id, menu_item_name, quantity, price_at_time, menu_item_id, sync_status) VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
      [id, orderId, item.menuItemName, item.quantity, item.priceAtTime, item.menuItemId || null]
    );
    
    const order = await this.fetchById(orderId);
    if(order) await recordOutboxEvent(db, 'sync_order', order);
  }

  static async delete(id: string): Promise<void> {
    const { getDb } = await import('@rms/db-local');
    const db = await getDb();
    await db.execute(`DELETE FROM order_items WHERE order_id=$1`, [id]);
    await db.execute(`DELETE FROM orders WHERE id=$1`, [id]);
    await recordOutboxEvent(db, 'delete_order', { id });
  }

  static async archive(id: string): Promise<void> {
    const { getDb } = await import('@rms/db-local');
    const db = await getDb();
    await db.execute(`UPDATE orders SET is_archived=1 WHERE id=$1`, [id]);
    
    const order = await this.fetchById(id);
    if(order) await recordOutboxEvent(db, 'sync_order', order);
  }
  
  static async updateFull(order: Order): Promise<void> {
    const { getDb } = await import('@rms/db-local');
    const db = await getDb();
    
    await db.execute(
      `UPDATE orders SET customer_name=$1, customer_phone=$2, payment_method=$3, total_amount=$4, reservation_date=$5 WHERE id=$6`,
      [order.customerName, order.customerPhone, order.paymentMethod, order.totalAmount, order.reservationDate || null, order.id]
    );
    
    await db.execute(`DELETE FROM order_items WHERE order_id=$1`, [order.id]);

    for (const item of order.items) {
      await db.execute(
        `INSERT INTO order_items (id, order_id, menu_item_name, quantity, price_at_time, menu_item_id) VALUES ($1, $2, $3, $4, $5, $6)`,
        [generateId(), order.id, item.menuItemName, item.quantity, item.priceAtTime, (item.menuItemId === "delivery" || !item.menuItemId) ? null : item.menuItemId]
      );
    }
    
    const updatedOrder = await this.fetchById(order.id);
    if(updatedOrder) await recordOutboxEvent(db, 'sync_order', updatedOrder);
  }
}
