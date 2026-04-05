import { pb } from '../pocketbase';
import { MenuCategory, MenuItem } from '@/store/useMenuStore';

export class MenuRepository {
  static async fetchCategories(): Promise<MenuCategory[]> {
    const records = await pb.collection('menu_categories').getFullList({
      sort: 'order_index',
    });
    return records.map((row: any) => ({
      id: row.id,
      name: row.name || '',
      orderIndex: row.order_index || 0,
    }));
  }

  static async fetchItems(): Promise<MenuItem[]> {
    const records = await pb.collection('menu_items').getFullList({
      sort: '-created',
    });
    
    return records.map((row: any) => ({
      id: row.id,
      name: row.name || '',
      price: row.price || 0,
      cost: 0,
      description: row.description || '',
      stock: row.stock || 0,
      isActive: row.is_active ?? true,
      image: row.image ? pb.files.getUrl(row, row.image) : (row.image_url || ''),
      isPoll: row.is_poll ?? false,
      recipeId: row.recipe_id,
      assemblyId: row.assembly_id,
      categoryId: row.category_id,
      kitchenDepartment: row.kitchen_department || '',
    }));
  }

  static async updateStock(id: string, newStockAmount: number): Promise<void> {
    await pb.collection('menu_items').update(id, { stock: newStockAmount });
  }

  static async saveItem(item: Partial<MenuItem> & { imageFile?: File }): Promise<void> {
    const formData = new FormData();
    formData.append('name', item.name || '');
    formData.append('price', (item.price || 0).toString());
    formData.append('description', item.description || '');
    formData.append('stock', (item.stock || 0).toString());
    formData.append('is_active', (item.isActive ?? true).toString());
    formData.append('is_poll', (item.isPoll ?? false).toString());
    formData.append('is_prep', (item.isPrep ?? false).toString());
    formData.append('unit', item.unit || 'шт');
    formData.append('write_off_on_produce', (item.writeOffOnProduce ?? false).toString());
    
    if (item.image) formData.append('image_url', item.image);
    
    if (item.recipeId) formData.append('recipe_id', item.recipeId);
    else formData.append('recipe_id', '');
    
    if (item.assemblyId) formData.append('assembly_id', item.assemblyId);
    else formData.append('assembly_id', '');
    
    if (item.categoryId) formData.append('category_id', item.categoryId);
    else formData.append('category_id', '');

    if (item.kitchenDepartment) formData.append('kitchen_department', item.kitchenDepartment);
    else formData.append('kitchen_department', '');

    if (item.imageFile) {
      formData.append('image', item.imageFile);
    }

    if (item.id) {
      await pb.collection('menu_items').update(item.id, formData);
    } else {
      await pb.collection('menu_items').create(formData);
    }
  }

  static async saveWithRecipe(item: Partial<MenuItem> & { imageFile?: File }, ingredients: {inventoryItemId?: string, nestedRecipeId?: string, quantity: number}[]): Promise<void> {
    // 1. Ensure a Recipe exists for this item
    let recipeId = item.recipeId;
    if (!recipeId) {
      const recipeRecord = await pb.collection('recipes').create({
        name: `ТТК: ${item.name}`,
        portions: 1, 
        labor_cost: 0,
        instructions: item.isPrep ? 'Авто-рецепт заготовки' : 'Авто-рецепт блюда',
      });
      recipeId = recipeRecord.id;
    } else {
      await pb.collection('recipes').update(recipeId, {
        name: `ТТК: ${item.name}`,
      });
    }

    // 2. Sync ingredients
    const oldIngredients = await pb.collection('recipe_ingredients').getFullList({
      filter: `recipe_id = "${recipeId}"`,
    });
    for (const old of oldIngredients) {
      await pb.collection('recipe_ingredients').delete(old.id);
    }
    
    for (const ing of ingredients) {
      await pb.collection('recipe_ingredients').create({
        recipe_id: recipeId,
        inventory_item_id: ing.inventoryItemId || null,
        nested_recipe_id: ing.nestedRecipeId || null,
        quantity: ing.quantity,
      });
    }

    // 3. Save the menu item
    await this.saveItem({ ...item, recipeId });
  }

  static async delete(id: string): Promise<void> {
    await pb.collection('menu_items').delete(id);
  }

  static async toggleActive(id: string, newValue: boolean): Promise<void> {
    await pb.collection('menu_items').update(id, { is_active: newValue });
  }
}
