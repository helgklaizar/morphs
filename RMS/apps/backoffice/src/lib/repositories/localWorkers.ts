import { Worker } from './workers';

const generateId = () => Math.random().toString(36).substring(2, 17);

const recordOutboxEvent = async (db: any, action: string, payload: any) => {
  const id = generateId();
  await db.execute(
    `INSERT INTO outbox_events (id, entity_type, action, payload_json, status) VALUES ($1, $2, $3, $4, $5)`,
    [id, 'workers', action, JSON.stringify(payload), 'pending']
  );
};

export class LocalWorkersRepository {
  static async fetchAll(): Promise<Worker[]> {
    const { getDb } = await import('@rms/db-local');
    const db = await getDb();
    const records = await db.select<any[]>(`SELECT * FROM workers ORDER BY created_at DESC`);
    
    return records.map((row: any) => ({
      id: row.id,
      name: row.name || '',
      role: row.role || '',
      hourly_rate: row.rate_per_hour || 0, // In SQLite it is rate_per_hour
      phone: row.phone || '',
      status: row.status || 'active',
      created: row.created_at,
      updated: row.created_at,
    }));
  }

  static async add(worker: Partial<Worker>): Promise<void> {
    const { getDb } = await import('@rms/db-local');
    const db = await getDb();
    const id = generateId();
    await db.execute(
      `INSERT INTO workers (id, name, role, rate_per_hour, phone, status) VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, worker.name || '', worker.role || '', worker.hourly_rate || 0, worker.phone || '', worker.status || 'active']
    );
    await recordOutboxEvent(db, 'worker_add', { id, ...worker });
  }

  static async update(id: string, payload: Partial<Worker>): Promise<void> {
    const { getDb } = await import('@rms/db-local');
    const db = await getDb();
    
    const fields = [];
    const values = [];
    let i = 1;

    if (payload.name !== undefined) { fields.push(`name=$${i++}`); values.push(payload.name); }
    if (payload.role !== undefined) { fields.push(`role=$${i++}`); values.push(payload.role); }
    if (payload.hourly_rate !== undefined) { fields.push(`rate_per_hour=$${i++}`); values.push(payload.hourly_rate); }
    if (payload.phone !== undefined) { fields.push(`phone=$${i++}`); values.push(payload.phone); }
    if (payload.status !== undefined) { fields.push(`status=$${i++}`); values.push(payload.status); }

    if (fields.length > 0) {
      values.push(id);
      await db.execute(`UPDATE workers SET ${fields.join(', ')} WHERE id=$${i}`, values);
      await recordOutboxEvent(db, 'worker_update', { id, ...payload });
    }
  }

  static async delete(id: string): Promise<void> {
    const { getDb } = await import('@rms/db-local');
    const db = await getDb();
    await db.execute(`DELETE FROM workers WHERE id=$1`, [id]);
    await recordOutboxEvent(db, 'worker_delete', { id });
  }
}
