import { InventoryCategory, InventoryItem } from './inventory';

import { generateId, recordOutboxEvent } from '@rms/db-local';

export class LocalInventoryRepository {
  static async fetchAll(): Promise<InventoryCategory[]> {
    const { getDb } = await import('@rms/db-local');
    const db = await getDb();

    const catData = await db.select<any[]>(`SELECT * FROM inventory_categories ORDER BY order_index ASC`);
    const itemData = await db.select<any[]>(`SELECT * FROM inventory_items`);

    return (catData || []).map((cat: any) => ({
      id: cat.id,
      name: cat.name || '',
      isVisibleInAssemblies: cat.is_visible_in_assemblies === 1,
      isVisibleInRecipe: cat.is_visible_in_recipe === 1,
      orderIndex: cat.order_index || 0,
      items: (itemData || [])
        .filter((item: any) => item.category_id === cat.id)
        .map((item: any) => ({
          id: item.id,
          name: item.name || '',
          price: item.price || 0,
          unit: item.unit || 'шт',
          quantity: item.stock || item.quantity || 0,
          categoryId: item.category_id,
          supplier: item.supplier || '',
          packSize: item.pack_size || 1,
          recipeUnit: item.recipe_unit || null,
          yieldPerUnit: item.yield_per_unit || null,
          isPrep: item.is_prep === 1,
        }))
        .sort((a: any, b: any) => a.name.localeCompare(b.name))
    }));
  }

  static async addCategory(name: string, maxOrder: number): Promise<void> {
    const { getDb } = await import('@rms/db-local');
    const db = await getDb();
    const id = generateId();
    await db.execute(
      `INSERT INTO inventory_categories (id, name, order_index, is_visible_in_assemblies, is_visible_in_recipe) VALUES ($1, $2, $3, 1, 1)`,
      [id, name, maxOrder + 1]
    );
    await recordOutboxEvent(db, 'inventory', 'category_add', { id, name, orderIndex: maxOrder + 1, isVisibleInAssemblies: true, isVisibleInRecipe: true });
  }

  static async deleteCategory(id: string): Promise<void> {
    const { getDb } = await import('@rms/db-local');
    const db = await getDb();
    await db.execute(`DELETE FROM inventory_categories WHERE id = $1`, [id]);
    await recordOutboxEvent(db, 'inventory', 'category_delete', { id });
  }

  static async saveItem(item: Partial<InventoryItem> & { categoryId: string, name: string }): Promise<void> {
    const { getDb } = await import('@rms/db-local');
    const db = await getDb();
    let isCreate = false;
    let itemId = item.id;
    if (!itemId) {
      isCreate = true;
      itemId = generateId();
    }

    const price = item.price || 0;
    const stock = item.quantity || 0;
    const unit = item.unit || 'шт';
    const supplier = item.supplier || '';
    const packSize = item.packSize || 1;
    const recipeUnit = item.recipeUnit || null;
    const yieldPerUnit = item.yieldPerUnit || null;
    const isPrep = item.isPrep ? 1 : 0;

    if (isCreate) {
      await db.execute(
        `INSERT INTO inventory_items (id, name, category_id, unit, price, stock, supplier, pack_size, recipe_unit, yield_per_unit) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [itemId, item.name, item.categoryId, unit, price, stock, supplier, packSize, recipeUnit, yieldPerUnit]
      );
      // NOTE: missing is_prep from insert due to old DB schema, let's gracefully ignore it in insert or use UPDATE later
      try {
        await db.execute(`UPDATE inventory_items SET is_prep = $1 WHERE id = $2`, [isPrep, itemId]);
      } catch(e){}
    } else {
      await db.execute(
        `UPDATE inventory_items SET name=$1, category_id=$2, unit=$3, price=$4, stock=$5, supplier=$6, pack_size=$7, recipe_unit=$8, yield_per_unit=$9 WHERE id=$10`,
        [item.name, item.categoryId, unit, price, stock, supplier, packSize, recipeUnit, yieldPerUnit, itemId]
      );
      try {
        await db.execute(`UPDATE inventory_items SET is_prep = $1 WHERE id = $2`, [isPrep, itemId]);
      } catch(e){}
    }
    
    // NOTE: Price Jump Notification is deferred to server-side or synced when online by SyncEngine logic.

    await recordOutboxEvent(db, 'inventory', 'item_save', {
      id: itemId,
      name: item.name,
      price,
      unit,
      quantity: stock,
      categoryId: item.categoryId,
      supplier,
      packSize,
      recipeUnit,
      yieldPerUnit,
      isPrep: item.isPrep || false
    });
  }

  static async deleteItem(id: string): Promise<void> {
    const { getDb } = await import('@rms/db-local');
    const db = await getDb();
    await db.execute(`DELETE FROM inventory_items WHERE id = $1`, [id]);
    await recordOutboxEvent(db, 'inventory', 'item_delete', { id });
  }

  static async updateQuantity(id: string, newQuantity: number): Promise<void> {
    const { getDb } = await import('@rms/db-local');
    const db = await getDb();
    await db.execute(`UPDATE inventory_items SET stock=$1 WHERE id=$2`, [newQuantity, id]);
    await recordOutboxEvent(db, 'inventory', 'item_update_quantity', { id, quantity: newQuantity });
  }

  static async updateCategoryVisibility(id: string, field: string, newValue: boolean): Promise<void> {
    const { getDb } = await import('@rms/db-local');
    const db = await getDb();
    const val = newValue ? 1 : 0;
    await db.execute(`UPDATE inventory_categories SET ${field}=$1 WHERE id=$2`, [val, id]);
    await recordOutboxEvent(db, 'inventory', 'category_update_visibility', { id, field, newValue });
  }

  static async updateCategoryOrder(id: string, orderIndex: number): Promise<void> {
    const { getDb } = await import('@rms/db-local');
    const db = await getDb();
    await db.execute(`UPDATE inventory_categories SET order_index=$1 WHERE id=$2`, [orderIndex, id]);
    await recordOutboxEvent(db, 'inventory', 'category_update_order', { id, orderIndex });
  }
}
