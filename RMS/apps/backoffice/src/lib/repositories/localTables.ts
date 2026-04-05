import { Table } from '@rms/types';
import { generateId, recordOutboxEvent } from '@rms/db-local';

export class LocalTablesRepository {
  static async fetchAll(): Promise<Table[]> {
    const { getDb } = await import('@rms/db-local');
    const db = await getDb();
    const records = await db.select<any[]>(`SELECT * FROM tables ORDER BY number ASC`);
    
    return records.map((r: any) => ({
      id: r.id,
      number: r.number || '',
      seats: r.seats || 1,
      zone: r.zone || '',
      position_x: r.position_x || 0,
      position_y: r.position_y || 0,
      isActive: Boolean(r.is_active),
    }));
  }

  static async create(payload: Partial<Table>): Promise<Table> {
    const { getDb } = await import('@rms/db-local');
    const db = await getDb();
    const id = payload.id || generateId();
    
    await db.execute(
      `INSERT INTO tables (id, number, seats, zone, position_x, position_y, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        id, 
        payload.number || '', 
        payload.seats || 1, 
        payload.zone || '', 
        payload.position_x || 0, 
        payload.position_y || 0, 
        payload.isActive !== false ? 1 : 0
      ]
    );

    const record = {
      id,
      number: payload.number || '',
      seats: payload.seats || 1,
      zone: payload.zone || '',
      position_x: payload.position_x || 0,
      position_y: payload.position_y || 0,
      isActive: payload.isActive !== false,
    };

    await recordOutboxEvent(db, 'tables', 'table_create', record);
    return record;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static async update(id: string, payload: Partial<Table>): Promise<void> {
    const { getDb } = await import('@rms/db-local');
    const db = await getDb();
    
    const fields = [];
    const values = [];
    let i = 1;

    if (payload.number !== undefined) { fields.push(`number=$${i++}`); values.push(payload.number); }
    if (payload.seats !== undefined) { fields.push(`seats=$${i++}`); values.push(payload.seats); }
    if (payload.zone !== undefined) { fields.push(`zone=$${i++}`); values.push(payload.zone); }
    if (payload.position_x !== undefined) { fields.push(`position_x=$${i++}`); values.push(payload.position_x); }
    if (payload.position_y !== undefined) { fields.push(`position_y=$${i++}`); values.push(payload.position_y); }
    if (payload.isActive !== undefined) { fields.push(`is_active=$${i++}`); values.push(payload.isActive ? 1 : 0); }

    if (fields.length > 0) {
      values.push(id);
      await db.execute(`UPDATE tables SET ${fields.join(', ')} WHERE id=$${i}`, values);
      await recordOutboxEvent(db, 'tables', 'table_update', { id, ...payload });
    }
  }

  static async delete(id: string): Promise<void> {
    const { getDb } = await import('@rms/db-local');
    const db = await getDb();
    await db.execute(`DELETE FROM tables WHERE id=$1`, [id]);
    await recordOutboxEvent(db, 'tables', 'table_delete', { id });
  }
}
