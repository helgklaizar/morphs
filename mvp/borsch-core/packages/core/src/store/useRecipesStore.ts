import { create } from 'zustand';
import { pb } from '@rms/db-local';
import { Recipe, RecipeIngredient } from '@rms/types';

interface RecipesState {
  recipes: Recipe[];
  isLoading: boolean;
  error: string | null;

  fetchRecipes: () => Promise<void>;
  saveRecipe: (recipe: Partial<Recipe>, ingredients: Partial<RecipeIngredient>[]) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
}

export const useRecipesStore = create<RecipesState>((set, get) => ({
  recipes: [],
  isLoading: true,
  error: null,

  fetchRecipes: async () => {
    set({ isLoading: true });
    try {
      const records = await pb.collection('recipes').getFullList({ expand: 'recipe_ingredients_via_recipe_id.inventory_item_id' });
      const recipes = records.map(r => {
        const expandedIngredients = r.expand?.recipe_ingredients_via_recipe_id || [];
        return {
          id: r.id,
          name: r.name,
          portions: r.portions,
          ingredients: expandedIngredients.map((i: any) => ({
            id: i.id,
            recipeId: i.recipe_id,
            inventoryItemId: i.inventory_item_id,
            quantity: i.quantity,
            inventoryItem: i.expand?.inventory_item_id ? {
              name: i.expand.inventory_item_id.name,
              unit: i.expand.inventory_item_id.unit,
              price: i.expand.inventory_item_id.price,
            } : undefined
          }))
        };
      }) as Recipe[];
      set({ recipes, isLoading: false, error: null });
    } catch (err: any) {
      console.error(err);
      set({ isLoading: false, error: err.message });
    }
  },

  saveRecipe: async (recipe, ingredients) => {
    try {
      let rId = recipe.id;
      if (rId) {
        await pb.collection('recipes').update(rId, { name: recipe.name, portions: recipe.portions });
      } else {
        const rc = await pb.collection('recipes').create({ name: recipe.name, portions: recipe.portions || 1 });
        rId = rc.id;
      }

      // Overwrite ingredients: delete old, create new. (This is basic approach)
      const oldIngs = await pb.collection('recipe_ingredients').getFullList({ filter: `recipe_id="${rId}"` });
      for (const oi of oldIngs) {
        await pb.collection('recipe_ingredients').delete(oi.id);
      }

      for (const i of ingredients) {
        if (i.inventoryItemId) {
          await pb.collection('recipe_ingredients').create({
            recipe_id: rId,
            inventory_item_id: i.inventoryItemId,
            quantity: i.quantity
          });
        }
      }

      await get().fetchRecipes();
    } catch (err) {
      console.error(err);
    }
  },

  deleteRecipe: async (id) => {
    try {
      await pb.collection('recipes').delete(id);
      await get().fetchRecipes();
    } catch (err) {
      console.error(err);
    }
  }
}));
