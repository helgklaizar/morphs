import { Recipe } from '@/lib/repositories/recipes';
import { generateId, recordOutboxEvent } from '@rms/db-local';

export class LocalRecipesRepository {
  static async fetchAll(): Promise<Recipe[]> {
    const { getDb } = await import('@rms/db-local');
    const db = await getDb();

    const rawRecipes = await db.select<any[]>(`SELECT * FROM recipes ORDER BY created_at DESC`);

    const rawIngredients = await db.select<any[]>(`
      SELECT ri.*, ii.name as inv_name, ii.unit as inv_unit, ii.price as inv_price, ii.recipe_unit as inv_recipe_unit
      FROM recipe_ingredients ri
      LEFT JOIN inventory_items ii ON ri.inventory_item_id = ii.id
    `);

    const recipeNamesMap: Record<string, string> = {};
    rawRecipes.forEach(r => { recipeNamesMap[r.id] = r.name; });

    return rawRecipes.map(r => {
      const ings = rawIngredients.filter(ing => ing.recipe_id === r.id);
      return {
        id: r.id,
        name: r.name || '',
        portions: r.portions || 1,
        isPrep: Boolean(r.is_prep),
        prepInventoryId: r.prep_inventory_id || undefined,
        ingredients: ings.map(ing => ({
          id: ing.id,
          recipeId: ing.recipe_id,
          inventoryItemId: ing.inventory_item_id || undefined,
          nestedRecipeId: ing.nested_recipe_id || undefined,
          quantity: ing.quantity || 0,
          inventoryItem: ing.inventory_item_id ? {
            name: ing.inv_name,
            unit: ing.inv_unit,
            price: ing.inv_price || 0,
            recipeUnit: ing.inv_recipe_unit || null,
          } : undefined,
          nestedRecipe: ing.nested_recipe_id && recipeNamesMap[ing.nested_recipe_id] ? {
            name: recipeNamesMap[ing.nested_recipe_id],
          } : undefined,
        }))
      };
    });
  }

  static async saveRecipe(
    id: string | null,
    name: string,
    portions: number,
    ingredients: { inventoryItemId?: string, nestedRecipeId?: string, quantity: number }[],
    isPrep: boolean = false,
    prepInventoryId: string | null = null
  ): Promise<string> {
    const { getDb } = await import('@rms/db-local');
    const db = await getDb();

    const recipeId = id || generateId();
    const validIngredients = ingredients.filter(i => i.inventoryItemId || i.nestedRecipeId);

    // Write Outbox Event FIRST (or inline) to ensure resilience.
    await recordOutboxEvent(db, 'recipes', 'recipe_save', {
      id: recipeId, name, portions, isPrep, prepInventoryId,
      ingredients: validIngredients
    });

    if (id) {
      await db.execute(
        `UPDATE recipes SET name=$1, portions=$2, is_prep=$3, prep_inventory_id=$4 WHERE id=$5`,
        [name, portions, isPrep ? 1 : 0, prepInventoryId || null, id]
      );
      await db.execute(`DELETE FROM recipe_ingredients WHERE recipe_id=$1`, [id]);
    } else {
      await db.execute(
        `INSERT INTO recipes (id, name, portions, is_prep, prep_inventory_id) VALUES ($1, $2, $3, $4, $5)`,
        [recipeId, name, portions, isPrep ? 1 : 0, prepInventoryId || null]
      );
    }

    for (const ing of validIngredients) {
      const ingId = generateId();
      await db.execute(
        `INSERT INTO recipe_ingredients (id, recipe_id, inventory_item_id, nested_recipe_id, quantity) VALUES ($1, $2, $3, $4, $5)`,
        [ingId, recipeId, ing.inventoryItemId || null, ing.nestedRecipeId || null, ing.quantity]
      );
    }

    return recipeId;
  }

  static async delete(id: string): Promise<void> {
    const { getDb } = await import('@rms/db-local');
    const db = await getDb();

    await recordOutboxEvent(db, 'recipes', 'recipe_delete', { id });
    
    await db.execute(`DELETE FROM recipe_ingredients WHERE recipe_id=$1`, [id]);
    await db.execute(`DELETE FROM recipes WHERE id=$1`, [id]);
  }
}
