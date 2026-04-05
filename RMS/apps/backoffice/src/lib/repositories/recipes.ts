import { pb } from '../pocketbase';

export interface RecipeIngredient {
  id: string;
  recipeId: string;
  inventoryItemId?: string;
  nestedRecipeId?: string;
  quantity: number;
  inventoryItem?: {
    name: string;
    unit: string;
    price: number;
    recipeUnit?: string | null;
  };
  nestedRecipe?: {
    name: string;
  };
}

export interface Recipe {
  id: string;
  name: string;
  portions: number;
  isPrep?: boolean;
  prepInventoryId?: string;
  ingredients: RecipeIngredient[];
}

export class RecipesRepository {
  static async fetchAll(): Promise<Recipe[]> {
    const raw = await pb.collection('recipes').getFullList({
      sort: '-created',
      expand: 'recipe_ingredients(recipe_id).inventory_item_id,recipe_ingredients(recipe_id).nested_recipe_id'
    });

    return (raw || []).map((row: any) => ({
      id: row.id,
      name: row.name || '',
      portions: row.portions || 1,
      isPrep: row.is_prep || false,
      prepInventoryId: row.prep_inventory_id || undefined,
      ingredients: (row.expand?.['recipe_ingredients(recipe_id)'] || []).map((ing: any) => ({
        id: ing.id,
        recipeId: ing.recipe_id,
        inventoryItemId: ing.inventory_item_id || undefined,
        nestedRecipeId: ing.nested_recipe_id || undefined,
        quantity: ing.quantity || 0,
        inventoryItem: ing.expand?.inventory_item_id ? {
          name: ing.expand.inventory_item_id.name,
          unit: ing.expand.inventory_item_id.unit,
          price: ing.expand.inventory_item_id.price || 0,
          recipeUnit: ing.expand.inventory_item_id.recipe_unit || null,
        } : undefined,
        nestedRecipe: ing.expand?.nested_recipe_id ? {
          name: ing.expand.nested_recipe_id.name,
        } : undefined
      }))
    }));
  }

  static async saveRecipe(id: string | null, name: string, portions: number, ingredients: { inventoryItemId?: string, nestedRecipeId?: string, quantity: number }[], isPrep: boolean = false, prepInventoryId: string | null = null): Promise<void> {
    let recipe;
    if (id) {
      recipe = await pb.collection('recipes').update(id, { name, portions, is_prep: isPrep, prep_inventory_id: prepInventoryId });
      // Delete old ingredients
      const oldIngs = await pb.collection('recipe_ingredients').getFullList({
        filter: pb.filter('recipe_id = {:id}', { id })
      });
      for (const oldIng of oldIngs) {
        await pb.collection('recipe_ingredients').delete(oldIng.id);
      }
    } else {
      recipe = await pb.collection('recipes').create({ name, portions, is_prep: isPrep, prep_inventory_id: prepInventoryId });
    }

    const validIngredients = ingredients.filter(i => i.inventoryItemId || i.nestedRecipeId);
    for (const ing of validIngredients) {
      await pb.collection('recipe_ingredients').create({
        recipe_id: recipe.id,
        inventory_item_id: ing.inventoryItemId || null,
        nested_recipe_id: ing.nestedRecipeId || null,
        quantity: ing.quantity
      });
    }
  }

  static async delete(id: string): Promise<void> {
    await pb.collection('recipes').delete(id);
  }

  /**
   * Calculates total food cost recursively.
   */
  static calculateCost(recipe: Recipe, allRecipes: Recipe[]): number {
    let total = 0;
    for (const ing of recipe.ingredients) {
      if (ing.inventoryItemId && ing.inventoryItem) {
        total += ing.inventoryItem.price * ing.quantity;
      } else if (ing.nestedRecipeId) {
        const sub = allRecipes.find(r => r.id === ing.nestedRecipeId);
        if (sub) {
          const subCost = this.calculateCost(sub, allRecipes);
          total += (subCost / (sub.portions || 1)) * ing.quantity;
        }
      }
    }
    return total;
  }
}
