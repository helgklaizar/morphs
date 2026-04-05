import { create } from 'zustand';
import { pb } from '@/lib/pocketbase';
import { RecipesRepository, Recipe, RecipeIngredient } from '@/lib/repositories/recipes';
import { LocalRecipesRepository } from '@/lib/repositories/localRecipes';
import { useToastStore } from '@/store/useToastStore';

const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;

export type { Recipe, RecipeIngredient };

interface RecipesState {
  recipes: Recipe[];
  isLoading: boolean;
  error: string | null;
  fetchRecipes: () => Promise<void>;
  saveRecipe: (id: string | null, name: string, portions: number, ingredients: { inventoryItemId?: string, nestedRecipeId?: string, quantity: number }[]) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
  calculateRecipeCost: (id: string) => number;
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
      const parsedRecipes = isTauri
        ? await LocalRecipesRepository.fetchAll()
        : await RecipesRepository.fetchAll();
      set({ recipes: parsedRecipes, isLoading: false });
    } catch (err: any) {
      console.error("fetchRecipes err:", err);
      set({ error: err.message, isLoading: false });
    }
  },

  saveRecipe: async (id, name, portions, ingredients) => {
    try {
      if (isTauri) {
        await LocalRecipesRepository.saveRecipe(id, name, portions, ingredients);
      } else {
        await RecipesRepository.saveRecipe(id, name, portions, ingredients);
      }
      await get().fetchRecipes();
    } catch (err: any) {
      useToastStore.getState().error("Ошибка сохранения: " + err.message);
      throw err;
    }
  },

  deleteRecipe: async (id) => {
    try {
      const prev = get().recipes;
      set(state => ({ recipes: state.recipes.filter(r => r.id !== id) }));
      if (isTauri) {
        await LocalRecipesRepository.delete(id);
      } else {
        await RecipesRepository.delete(id);
      }
    } catch (err: any) {
      console.error(err);
      useToastStore.getState().error("Ошибка удаления рецепта: " + err.message);
      get().fetchRecipes();
    }
  },

  calculateRecipeCost: (id) => {
    const recipes = get().recipes;
    const recipe = recipes.find(r => r.id === id);
    if (!recipe) return 0;
    return RecipesRepository.calculateCost(recipe, recipes);
  },

  subscribeToRecipes: async () => {
    if (isTauri) {
      try {
        const { listen } = await import('@tauri-apps/api/event');
        listen('sync-completed', () => {
          get().fetchRecipes();
        });
      } catch (e) {
        console.error("Failed to subscribe to tauri events", e);
      }
      return;
    }
    pb.collection('recipes').subscribe('*', () => get().fetchRecipes());
    pb.collection('recipe_ingredients').subscribe('*', () => get().fetchRecipes());
  },

  unsubscribeFromRecipes: () => {
    if (isTauri) return;
    pb.collection('recipes').unsubscribe('*');
    pb.collection('recipe_ingredients').unsubscribe('*');
  }
}));
