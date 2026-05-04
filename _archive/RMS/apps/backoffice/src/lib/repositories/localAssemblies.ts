import { AssemblyRecord } from '@/lib/repositories/assemblies';
import { generateId, recordOutboxEvent } from '@rms/db-local';

export class LocalAssembliesRepository {
  static async fetchAll(): Promise<AssemblyRecord[]> {
    const { getDb } = await import('@rms/db-local');
    const db = await getDb();
    
    const rawAssemblies = await db.select<any[]>(`SELECT * FROM assemblies ORDER BY created_at DESC`);
    const rawItems = await db.select<any[]>(`
      SELECT ai.*, ii.name as inv_name, ii.unit as inv_unit, ii.price as inv_price
      FROM assembly_items ai
      LEFT JOIN inventory_items ii ON ai.inventory_item_id = ii.id
    `);

    return rawAssemblies.map(a => {
      const items = rawItems.filter(ai => ai.assembly_id === a.id);
      return {
        id: a.id,
        name: a.name || '',
        totalCost: items.reduce((sum, item) => sum + (item.inv_price || 0) * (item.quantity || 0), 0),
        items: items.map(item => ({
          id: item.id,
          assemblyId: item.assembly_id,
          inventoryItemId: item.inventory_item_id,
          quantity: item.quantity || 0,
          name: item.inv_name || '',
          unit: item.inv_unit || 'шт',
          inventoryItemPrice: item.inv_price || 0,
        }))
      };
    });
  }

  static async add(name: string, items: { inventoryItemId: string, quantity: number }[]): Promise<void> {
    const { getDb } = await import('@rms/db-local');
    const db = await getDb();
    
    const assemblyId = generateId();
    const validItems = items.filter(i => i.inventoryItemId && i.quantity > 0);
    const payload = { id: assemblyId, name, items: validItems };
    await recordOutboxEvent(db, 'assemblies', 'assembly_save', payload);

    await db.execute(`INSERT INTO assemblies (id, name) VALUES ($1, $2)`, [assemblyId, name]);

    for (const item of validItems) {
      const itemId = generateId();
      await db.execute(
        `INSERT INTO assembly_items (id, assembly_id, inventory_item_id, quantity) VALUES ($1, $2, $3, $4)`,
        [itemId, assemblyId, item.inventoryItemId, item.quantity]
      );
    }
  }

  static async update(id: string, name: string, items: { inventoryItemId: string, quantity: number }[]): Promise<void> {
    const { getDb } = await import('@rms/db-local');
    const db = await getDb();
    const validItems = items.filter(i => i.inventoryItemId && i.quantity > 0);
    const payload = { id, name, items: validItems };
    await recordOutboxEvent(db, 'assemblies', 'assembly_save', payload);

    await db.execute(`UPDATE assemblies SET name=$1 WHERE id=$2`, [name, id]);
    await db.execute(`DELETE FROM assembly_items WHERE assembly_id=$1`, [id]);

    for (const item of validItems) {
      const itemId = generateId();
      await db.execute(
        `INSERT INTO assembly_items (id, assembly_id, inventory_item_id, quantity) VALUES ($1, $2, $3, $4)`,
        [itemId, id, item.inventoryItemId, item.quantity]
      );
    }
  }

  static async delete(id: string): Promise<void> {
    const { getDb } = await import('@rms/db-local');
    const db = await getDb();
    
    await recordOutboxEvent(db, 'assemblies', 'assembly_delete', { id });

    await db.execute(`DELETE FROM assembly_items WHERE assembly_id=$1`, [id]);
    await db.execute(`DELETE FROM assemblies WHERE id=$1`, [id]);
  }
}
