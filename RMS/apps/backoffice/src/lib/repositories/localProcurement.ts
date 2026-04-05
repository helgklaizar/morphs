import { SupplierOrderDraft } from '@/store/useProcurementStore';

const generateId = () => Math.random().toString(36).substring(2, 17);

const recordOutboxEvent = async (db: any, action: string, payload: any) => {
  const id = generateId();
  await db.execute(
    `INSERT INTO outbox_events (id, entity_type, action, payload_json, status) VALUES ($1, $2, $3, $4, $5)`,
    [id, 'supplier_orders', action, JSON.stringify(payload), 'pending']
  );
};

export class LocalProcurementRepository {
  static async fetchDrafts(): Promise<SupplierOrderDraft[]> {
    const { getDb } = await import('@rms/db-local');
    const db = await getDb();
    const rows = await db.select<any[]>(`
      SELECT so.*, s.name as supplier_name 
      FROM supplier_orders so
      LEFT JOIN suppliers s ON so.supplier_id = s.id
      ORDER BY so.created_at DESC
    `);
    return rows.map(r => ({
      id: r.id,
      supplier_id: r.supplier_id || '',
      supplierName: r.supplier_name || 'Неизвестный поставщик',
      status: r.status,
      total_amount: r.total_amount || 0,
      items: r.items || '[]',
      created: r.created_at || '',
    }));
  }

  static async createDraft(supplierId: string, supplierName: string, items: any[], totalAmount: number): Promise<void> {
    const { getDb } = await import('@rms/db-local');
    const db = await getDb();
    const id = generateId();
    await db.execute(
      `INSERT INTO supplier_orders (id, supplier_id, status, total_amount, items, sync_status) VALUES ($1, $2, 'draft', $3, $4, 'pending')`,
      [id, supplierId, totalAmount, JSON.stringify(items)]
    );
    await recordOutboxEvent(db, 'order_create', { id, supplierId, supplierName, items, totalAmount, status: 'draft' });
  }

  static async updateStatus(id: string, status: string): Promise<void> {
    const { getDb } = await import('@rms/db-local');
    const db = await getDb();
    await db.execute(`UPDATE supplier_orders SET status=$1, sync_status='pending' WHERE id=$2`, [status, id]);
    await recordOutboxEvent(db, 'order_status', { id, status });
  }

  static async deleteDraft(id: string): Promise<void> {
    const { getDb } = await import('@rms/db-local');
    const db = await getDb();
    await db.execute(`DELETE FROM supplier_orders WHERE id=$1`, [id]);
    await recordOutboxEvent(db, 'order_delete', { id });
  }

  /** Cache received orders from server into local SQLite */
  static async cacheFromServer(orders: SupplierOrderDraft[]): Promise<void> {
    const { getDb } = await import('@rms/db-local');
    const db = await getDb();
    for (const o of orders) {
      await db.execute(
        `INSERT OR REPLACE INTO supplier_orders (id, supplier_id, status, total_amount, items, created_at, sync_status)
         VALUES ($1, $2, $3, $4, $5, $6, 'synced')`,
        [o.id, o.supplier_id, o.status, o.total_amount, o.items, o.created]
      );
    }
  }
}
