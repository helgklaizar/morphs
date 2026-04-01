import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export interface RecipeIngredient {
  id: string;
  recipeId: string;
  inventoryItemId: string;
  quantity: number;
  inventoryItem?: {
    name: string;
    unit: string;
    price: number;
    recipeUnit?: string | null;
    yieldPerUnit?: number | null;
  };
}

export interface Recipe {
  id: string;
  name: string;
  portions: number;
  ingredients: RecipeIngredient[];
}

interface RecipesState {
  recipes: Recipe[];
  isLoading: boolean;
  error: string | null;
  fetchRecipes: () => Promise<void>;
  addRecipe: (name: string, portions: number, ingredients: { inventoryItemId: string, quantity: number }[]) => Promise<void>;
  updateRecipe: (id: string, name: string, portions: number, ingredients: { inventoryItemId: string, quantity: number }[]) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
  subscribeToRecipes: () => void;
  unsubscribeFromRecipes: () => void;
}

export const useRecipesStore = create<RecipesState>((set, get) => ({
  recipes: [],
  isLoading: true,
  error: null,

  fetchRecipes: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select(`
          id, name, portions,
          recipe_ingredients (
            id, recipe_id, inventory_item_id, quantity,
            inventory_items (name, unit, price, recipe_unit, yield_per_unit)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const parsedRecipes: Recipe[] = (data || []).map((row: any) => ({
        id: row.id,
        name: row.name || '',
        portions: row.portions || 1,
        ingredients: (row.recipe_ingredients || []).map((ing: any) => ({
          id: ing.id,
          recipeId: ing.recipe_id,
          inventoryItemId: ing.inventory_item_id,
          quantity: ing.quantity,
          inventoryItem: ing.inventory_items ? {
            name: ing.inventory_items.name,
            unit: ing.inventory_items.unit,
            price: ing.inventory_items.price || 0,
            recipeUnit: ing.inventory_items.recipe_unit || null,
            yieldPerUnit: ing.inventory_items.yield_per_unit || null,
          } : undefined
        }))
      }));

      set({ recipes: parsedRecipes, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  addRecipe: async (name, portions, ingredients) => {
    try {
      const { data: recipe, error: err1 } = await supabase.from('recipes').insert({ name, portions }).select().single();
      if (err1) throw err1;
      
      const validIngredients = ingredients.filter(i => i.inventoryItemId !== "");
      if (validIngredients.length > 0) {
        const ingredientsData = validIngredients.map(ing => ({
          recipe_id: recipe.id,
          inventory_item_id: ing.inventoryItemId,
          quantity: ing.quantity
        }));
        const { error: err2 } = await supabase.from('recipe_ingredients').insert(ingredientsData);
        if (err2) throw err2;
      }
    } catch (err: any) {
      alert("Ошибка сохранения: " + err.message);
      throw err;
    }
  },

  updateRecipe: async (id, name, portions, ingredients) => {
    try {
      const { error: err1 } = await supabase.from('recipes').update({ name, portions }).eq('id', id);
      if (err1) throw err1;
      
      const { error: err2 } = await supabase.from('recipe_ingredients').delete().eq('recipe_id', id);
      if (err2) throw err2;
      
      const validIngredients = ingredients.filter(i => i.inventoryItemId !== "");
      if (validIngredients.length > 0) {
        const ingredientsData = validIngredients.map(ing => ({
          recipe_id: id,
          inventory_item_id: ing.inventoryItemId,
          quantity: ing.quantity
        }));
        const { error: err3 } = await supabase.from('recipe_ingredients').insert(ingredientsData);
        if (err3) throw err3;
      }
    } catch (err: any) {
      alert("Ошибка сохранения: " + err.message);
      throw err;
    }
  },

  deleteRecipe: async (id) => {
    try {
      const prev = get().recipes;
      set(state => ({ recipes: state.recipes.filter(r => r.id !== id) }));
      
      await supabase.from('recipe_ingredients').delete().eq('recipe_id', id);
      const { error } = await supabase.from('recipes').delete().eq('id', id).select();
      
      if (error) {
        console.error(error);
        alert("Ошибка удаления рецепта: " + error.message);
        set({ recipes: prev });
      }
    } catch (err: any) {
      get().fetchRecipes();
      console.error(err);
    }
  },

  subscribeToRecipes: () => {
    supabase.channel('recipes-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recipes' }, () => get().fetchRecipes())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recipe_ingredients' }, () => get().fetchRecipes())
      .subscribe();
  },

  unsubscribeFromRecipes: () => {
    supabase.channel('recipes-realtime').unsubscribe();
  }
}));
