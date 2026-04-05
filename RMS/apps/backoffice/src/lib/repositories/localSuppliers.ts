import { SupplierRecord } from '@/lib/repositories/suppliers';

const generateId = () => Math.random().toString(36).substring(2, 17);

const recordOutboxEvent = async (db: any, action: string, payload: any) => {
  const id = generateId();
  await db.execute(
    `INSERT INTO outbox_events (id, entity_type, action, payload_json, status) VALUES ($1, $2, $3, $4, $5)`,
    [id, 'suppliers', action, JSON.stringify(payload), 'pending']
  );
};

export class LocalSuppliersRepository {
  static async fetchAll(): Promise<SupplierRecord[]> {
    const { getDb } = await import('@rms/db-local');
    const db = await getDb();
    const rows = await db.select<any[]>(`SELECT * FROM suppliers ORDER BY name ASC`);
    return rows.map(r => ({
      id: r.id,
      name: r.name || '',
      phone: r.phone || '',
      email: r.email || '',
      address: r.address || '',
      category: r.category || '',
      notes: r.notes || '',
      hours: r.hours || undefined,
      preferred_language: r.preferred_language || undefined,
    }));
  }

  /** Cache suppliers from server into local SQLite */
  static async cacheFromServer(suppliers: SupplierRecord[]): Promise<void> {
    const { getDb } = await import('@rms/db-local');
    const db = await getDb();
    for (const s of suppliers) {
      await db.execute(
        `INSERT OR REPLACE INTO suppliers (id, name, phone, email, address, category, notes, hours, preferred_language, sync_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'synced')`,
        [s.id, s.name, s.phone || '', s.email || '', s.address || '', s.category || '', s.notes || '', s.hours || null, s.preferred_language || null]
      );
    }
  }

  static async add(payload: Partial<SupplierRecord>): Promise<void> {
    const { getDb } = await import('@rms/db-local');
    const db = await getDb();
    const id = generateId();
    await db.execute(
      `INSERT INTO suppliers (id, name, phone, email, address, category, notes, hours, preferred_language, sync_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')`,
      [id, payload.name || '', payload.phone || '', payload.email || '', payload.address || '', payload.category || '', payload.notes || '', payload.hours || null, payload.preferred_language || null]
    );
    await recordOutboxEvent(db, 'supplier_create', { ...payload, id });
  }

  static async update(id: string, payload: Partial<SupplierRecord>): Promise<void> {
    const { getDb } = await import('@rms/db-local');
    const db = await getDb();
    const fields: string[] = [];
    const vals: any[] = [];
    let i = 1;
    if (payload.name !== undefined) { fields.push(`name=$${i++}`); vals.push(payload.name); }
    if (payload.phone !== undefined) { fields.push(`phone=$${i++}`); vals.push(payload.phone); }
    if (payload.email !== undefined) { fields.push(`email=$${i++}`); vals.push(payload.email); }
    if (payload.address !== undefined) { fields.push(`address=$${i++}`); vals.push(payload.address); }
    if (payload.category !== undefined) { fields.push(`category=$${i++}`); vals.push(payload.category); }
    if (payload.notes !== undefined) { fields.push(`notes=$${i++}`); vals.push(payload.notes); }
    if (payload.hours !== undefined) { fields.push(`hours=$${i++}`); vals.push(payload.hours); }
    if (payload.preferred_language !== undefined) { fields.push(`preferred_language=$${i++}`); vals.push(payload.preferred_language); }
    if (fields.length > 0) {
      fields.push(`sync_status='pending'`);
      await db.execute(`UPDATE suppliers SET ${fields.join(',')} WHERE id=$${i}`, [...vals, id]);
    }
    await recordOutboxEvent(db, 'supplier_update', { ...payload, id });
  }

  static async delete(id: string): Promise<void> {
    const { getDb } = await import('@rms/db-local');
    const db = await getDb();
    await db.execute(`DELETE FROM suppliers WHERE id=$1`, [id]);
    await recordOutboxEvent(db, 'supplier_delete', { id });
  }
}
