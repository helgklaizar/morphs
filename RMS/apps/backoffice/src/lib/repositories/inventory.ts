import { pb } from '../pocketbase';

export interface InventoryItem {
  id: string;
  name: string;
  price: number;
  unit: string;
  quantity: number;
  categoryId: string;
  supplier?: string;
  packSize?: number;
  recipeUnit?: string | null;
  yieldPerUnit?: number | null;
  isPrep?: boolean;
}

export interface InventoryCategory {
  id: string;
  name: string;
  isVisibleInAssemblies: boolean;
  isVisibleInRecipe: boolean;
  orderIndex: number;
  items: InventoryItem[];
}

export class InventoryRepository {
  static async fetchAll(): Promise<InventoryCategory[]> {
    const catData = await pb.collection('inventory_categories').getFullList({
      sort: 'order_index',
    });

    const itemData = await pb.collection('inventory_items').getFullList();

    return (catData || []).map((cat: any) => ({
      id: cat.id,
      name: cat.name || '',
      isVisibleInAssemblies: cat.is_visible_in_assemblies ?? true,
      isVisibleInRecipe: cat.is_visible_in_recipe ?? true,
      orderIndex: cat.order_index || 0,
      items: (itemData || [])
        .filter((item: any) => item.category_id === cat.id)
        .map((item: any) => ({
          id: item.id,
          name: item.name || '',
          price: item.price || 0,
          unit: item.unit || 'шт',
          quantity: item.quantity || 0,
          categoryId: item.category_id,
          supplier: item.supplier || '',
          packSize: item.pack_size || 1,
          recipeUnit: item.recipe_unit || null,
          yieldPerUnit: item.yield_per_unit || null,
          isPrep: item.is_prep || false,
        }))
        .sort((a: any, b: any) => a.name.localeCompare(b.name))
    }));
  }

  static async addCategory(name: string, maxOrder: number): Promise<void> {
    await pb.collection('inventory_categories').create({ 
      name, 
      order_index: maxOrder + 1,
      is_visible_in_assemblies: true,
      is_visible_in_recipe: true
    });
  }

  static async deleteCategory(id: string): Promise<void> {
    await pb.collection('inventory_categories').delete(id);
  }

  static async saveItem(item: Partial<InventoryItem> & { categoryId: string, name: string }): Promise<void> {
    const payload = {
      name: item.name,
      price: item.price || 0,
      unit: item.unit || 'шт',
      quantity: item.quantity || 0,
      category_id: item.categoryId,
      supplier: item.supplier || '',
      pack_size: item.packSize || 1,
      recipe_unit: item.recipeUnit || null,
      yield_per_unit: item.yieldPerUnit || null,
      is_prep: item.isPrep || false,
    };

    if (item.id) {
      // PRO: Price Jump Tracking
      try {
        const old = await pb.collection('inventory_items').getOne(item.id);
        const oldPrice = old.price || 0;
        const newPrice = item.price || 0;
        if (oldPrice > 0 && newPrice > oldPrice * 1.15) {
          const jump = ((newPrice - oldPrice) / oldPrice * 100).toFixed(0);
          const { NotificationsRepository } = await import('./notifications');
          await NotificationsRepository.notify(
            '⚠️ Скачок цены!',
            `Ингредиент "${item.name}" подорожал на ${jump}% (с ${oldPrice} до ${newPrice} ₪). Это может критически повлиять на фудкост!`,
            'price_warning'
          );
        }
      } catch (e) { console.error("Price tracking failed:", e); }

      await pb.collection('inventory_items').update(item.id, payload);
    } else {
      await pb.collection('inventory_items').create(payload);
    }
  }

  static async deleteItem(id: string): Promise<void> {
    await pb.collection('inventory_items').delete(id);
  }

  static async updateQuantity(id: string, newQuantity: number): Promise<void> {
    await pb.collection('inventory_items').update(id, { quantity: newQuantity });
  }

  static async updateCategoryVisibility(id: string, field: string, newValue: boolean): Promise<void> {
    await pb.collection('inventory_categories').update(id, { [field]: newValue });
  }

  static async updateCategoryOrder(id: string, orderIndex: number): Promise<void> {
    await pb.collection('inventory_categories').update(id, { order_index: orderIndex });
  }
}
