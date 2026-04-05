import { MenuCategory, MenuItem } from '@/store/useMenuStore';

const generateId = () => Math.random().toString(36).substring(2, 17);

const recordOutboxEvent = async (db: any, action: string, payload: any) => {
  const id = generateId();
  await db.execute(
    `INSERT INTO outbox_events (id, entity_type, action, payload_json, status) VALUES ($1, $2, $3, $4, $5)`,
    [id, 'menu', action, JSON.stringify(payload), 'pending']
  );
};

export class LocalMenuRepository {
  static async fetchCategories(): Promise<MenuCategory[]> {
    const { getDb } = await import('@rms/db-local');
    const db = await getDb();
    const records = await db.select<any[]>(`SELECT * FROM menu_categories ORDER BY order_index ASC`);
    return records.map(r => ({
      id: r.id,
      name: r.name || '',
      orderIndex: r.order_index || 0,
    }));
  }

  static async fetchItems(): Promise<MenuItem[]> {
    const { getDb } = await import('@rms/db-local');
    const db = await getDb();
    const query = `
      SELECT m.*, c.name as category_name
      FROM menu_items m
      LEFT JOIN menu_categories c ON m.category_id = c.id
      ORDER BY m.created_at DESC
    `;
    const records = await db.select<any[]>(query);
    
    return records.map(row => ({
      id: row.id,
      name: row.name || '',
      price: row.price || 0,
      cost: 0,
      description: row.description || '',
      stock: row.stock || 0,
      isActive: Boolean(row.is_active),
      image: row.image_url || '',
      isPoll: Boolean(row.is_poll),
      recipeId: row.recipe_id,
      assemblyId: row.assembly_id,
      categoryId: row.category_id,
      categoryName: row.category_name || '',
      kitchenDepartment: row.kitchen_department || '',
      isPrep: Boolean(row.is_prep),
      unit: row.unit || 'шт',
      writeOffOnProduce: Boolean(row.write_off_on_produce),
    }));
  }

  static async updateStock(id: string, newStockAmount: number): Promise<void> {
    const { getDb } = await import('@rms/db-local');
    const db = await getDb();
    await db.execute(`UPDATE menu_items SET stock=$1 WHERE id=$2`, [newStockAmount, id]);
    await recordOutboxEvent(db, 'menu_item_update_stock', { id, stock: newStockAmount });
  }

  static async toggleActive(id: string, newValue: boolean): Promise<void> {
    const { getDb } = await import('@rms/db-local');
    const db = await getDb();
    await db.execute(`UPDATE menu_items SET is_active=$1 WHERE id=$2`, [newValue ? 1 : 0, id]);
    await recordOutboxEvent(db, 'menu_item_toggle_active', { id, is_active: newValue });
  }

  static async saveItem(item: Partial<MenuItem>): Promise<void> {
    const { getDb } = await import('@rms/db-local');
    const db = await getDb();
    
    // In offline mode we fallback image uploads to skipped or URL assignment
    // Pocketbase will handle proper file objects when online
    
    let id = item.id;
    if (id) {
      const fields = [];
      const values = [];
      let i = 1;

      if (item.name !== undefined) { fields.push(`name=$${i++}`); values.push(item.name); }
      if (item.price !== undefined) { fields.push(`price=$${i++}`); values.push(item.price); }
      if (item.description !== undefined) { fields.push(`description=$${i++}`); values.push(item.description); }
      if (item.stock !== undefined) { fields.push(`stock=$${i++}`); values.push(item.stock); }
      if (item.isActive !== undefined) { fields.push(`is_active=$${i++}`); values.push(item.isActive ? 1 : 0); }
      if (item.isPoll !== undefined) { fields.push(`is_poll=$${i++}`); values.push(item.isPoll ? 1 : 0); }
      if (item.categoryId !== undefined) { fields.push(`category_id=$${i++}`); values.push(item.categoryId); }
      if (item.kitchenDepartment !== undefined) { fields.push(`kitchen_department=$${i++}`); values.push(item.kitchenDepartment); }
      if (item.isPrep !== undefined) { fields.push(`is_prep=$${i++}`); values.push(item.isPrep ? 1 : 0); }
      if (item.unit !== undefined) { fields.push(`unit=$${i++}`); values.push(item.unit); }
      if (item.writeOffOnProduce !== undefined) { fields.push(`write_off_on_produce=$${i++}`); values.push(item.writeOffOnProduce ? 1 : 0); }

      if (fields.length > 0) {
        values.push(id);
        await db.execute(`UPDATE menu_items SET ${fields.join(', ')} WHERE id=$${i}`, values);
      }
    } else {
      id = generateId();
      await db.execute(
        `INSERT INTO menu_items (id, name, price, description, stock, is_active, is_poll, category_id, kitchen_department, is_prep, unit, write_off_on_produce) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          id, item.name || '', item.price || 0, item.description || '', item.stock || 0,
          item.isActive !== false ? 1 : 0, item.isPoll ? 1 : 0, item.categoryId || '', item.kitchenDepartment || '',
          item.isPrep ? 1 : 0, item.unit || 'шт', item.writeOffOnProduce ? 1 : 0
        ]
      );
    }

    // Notice we do avoid saving the File object to the outbox payloads because JSON.stringify would strip it. 
    // In robust forms we would convert via FileReader to b64, but keeping it simple for POS operations.
    let payloadStr = JSON.stringify({ ...item, id });
    await recordOutboxEvent(db, 'menu_item_save', JSON.parse(payloadStr));
  }

  static async delete(id: string): Promise<void> {
    const { getDb } = await import('@rms/db-local');
    const db = await getDb();
    await db.execute(`DELETE FROM menu_items WHERE id=$1`, [id]);
    await recordOutboxEvent(db, 'menu_item_delete', { id });
  }

  // Recipes creation offline is complex due to multiple dependent collections 
  // We'll throw an explicit error or just skip it if needed, relying on PB.
  static async saveWithRecipe(item: Partial<MenuItem>, ingredients: any[]): Promise<void> {
    const { LocalRecipesRepository } = await import('./localRecipes');
    const recipeName = `ТТК: ${item.name}`;
    const recipeId = await LocalRecipesRepository.saveRecipe(
      item.recipeId || null,
      recipeName,
      1,
      ingredients,
      item.isPrep || false,
      null
    );

    await this.saveItem({ ...item, recipeId });
  }
}
