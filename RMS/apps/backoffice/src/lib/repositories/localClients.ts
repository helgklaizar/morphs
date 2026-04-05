import { ClientRecord } from './clients';

const generateId = () => Math.random().toString(36).substring(2, 17);

const recordOutboxEvent = async (db: any, action: string, payload: any) => {
  const id = generateId();
  await db.execute(
    `INSERT INTO outbox_events (id, entity_type, action, payload_json, status) VALUES ($1, $2, $3, $4, $5)`,
    [id, 'clients', action, JSON.stringify(payload), 'pending']
  );
};

export class LocalClientsRepository {
  static async fetchAll(): Promise<ClientRecord[]> {
    const { getDb } = await import('@rms/db-local');
    const db = await getDb();
    const records = await db.select<any[]>(`SELECT * FROM clients ORDER BY created_at DESC`);
    return records.map(r => ({
      id: r.id,
      name: r.name,
      phone: r.phone,
      address: r.address,
      created: r.created_at,
      orders_count: r.total_orders || 0
    })) as ClientRecord[];
  }

  static async getById(id: string): Promise<ClientRecord | null> {
    const { getDb } = await import('@rms/db-local');
    const db = await getDb();
    const records = await db.select<any[]>(`SELECT * FROM clients WHERE id=$1`, [id]);
    if (records.length === 0) return null;
    const r = records[0];
    return {
      id: r.id,
      name: r.name,
      phone: r.phone,
      address: r.address,
      created: r.created_at,
      orders_count: r.total_orders || 0
    } as ClientRecord;
  }

  static async add(payload: Partial<ClientRecord>): Promise<void> {
    const { getDb } = await import('@rms/db-local');
    const db = await getDb();
    const id = generateId();
    await db.execute(
      `INSERT INTO clients (id, name, phone, address, email) VALUES ($1, $2, $3, $4, $5)`,
      [id, payload.name || '', payload.phone || '', payload.address || '', '']
    );
    await recordOutboxEvent(db, 'client_add', { id, ...payload });
  }

  static async update(id: string, payload: Partial<ClientRecord>): Promise<void> {
    const { getDb } = await import('@rms/db-local');
    const db = await getDb();
    const fields = [];
    const values = [];
    let i = 1;
    
    if (payload.name !== undefined) { fields.push(`name=$${i++}`); values.push(payload.name); }
    if (payload.phone !== undefined) { fields.push(`phone=$${i++}`); values.push(payload.phone); }
    if (payload.address !== undefined) { fields.push(`address=$${i++}`); values.push(payload.address); }

    if (fields.length > 0) {
      values.push(id);
      await db.execute(`UPDATE clients SET ${fields.join(', ')} WHERE id=$${i}`, values);
      await recordOutboxEvent(db, 'client_update', { id, ...payload });
    }
  }

  static async delete(id: string): Promise<void> {
    const { getDb } = await import('@rms/db-local');
    const db = await getDb();
    // Skipping frontend cascading delete for offline fallback. Pocketbase handles it or we decouple it.
    await db.execute(`DELETE FROM clients WHERE id=$1`, [id]);
    await recordOutboxEvent(db, 'client_delete', { id });
  }
}
