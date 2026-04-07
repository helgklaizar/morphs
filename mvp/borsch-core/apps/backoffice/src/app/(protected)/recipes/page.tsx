"use client";

import { useState, useEffect } from "react";
import { useRecipesStore, useInventoryStore } from "@rms/core";
import { Plus, Trash2, Edit2, Utensils, BookOpen } from "lucide-react";

import { MenuSharedHeader } from "@/components/MenuSharedHeader";
import { RecipeModal } from "./components/RecipeModal";
import { Recipe } from "@rms/core";
import { ConfirmModal } from "@/components/ConfirmModal";

export default function RecipesPage() {
  const { recipes, fetchRecipes, deleteRecipe } = useRecipesStore();
  const { fetchInventory } = useInventoryStore();

  const [isLoading, setIsLoading] = useState(true);
  const [editingRecipe, setEditingRecipe] = useState<{isOpen: boolean, recipe: Recipe | null}>({isOpen: false, recipe: null});
  const [deletingRecipe, setDeletingRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    Promise.all([fetchRecipes(), fetchInventory()]).finally(() => setIsLoading(false));
  }, [fetchRecipes, fetchInventory]);

  return (
    <div className="flex h-full flex-col">
      <MenuSharedHeader />

      <div className="px-4 py-2 mt-2 -mb-2 flex justify-end">
        <button 
          onClick={() => setEditingRecipe({isOpen: true, recipe: null})}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] md:text-[13px] font-bold uppercase tracking-wider transition-all bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
        >
          <Plus className="w-4 h-4 shrink-0" />
          Новый рецепт
        </button>
      </div>

      <div className="flex-1 overflow-auto pb-10 mt-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-full opacity-50">Загрузка рецептов...</div>
        ) : recipes.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-full text-white/30 gap-4 py-20">
            <BookOpen className="w-16 h-16 opacity-20" />
            <span>Нет рецептов. Создайте первый рецепт из ингредиентов склада.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recipes.map((r) => (
              <div key={r.id} className="bg-[#141414] border border-white/5 rounded-2xl p-5 hover:border-white/20 transition-all flex flex-col gap-4 group">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-xl text-white mr-4">{r.name}</h3>
                  <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => setEditingRecipe({isOpen: true, recipe: r})}
                      className="p-2 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setDeletingRecipe(r)}
                      className="p-2 hover:bg-red-500/20 rounded-lg text-red-500/50 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="text-sm text-white/70 bg-black/40 border border-white/5 rounded-xl p-4 flex-1">
                  <div className="font-bold mb-3 uppercase tracking-wide flex items-center gap-2 text-indigo-400 text-xs">
                    <Utensils className="w-3.5 h-3.5" /> Ингредиенты
                  </div>
                  <div className="space-y-2.5">
                    {r.ingredients.length > 0 ? r.ingredients.map(ing => (
                      <div key={ing.id} className="flex justify-between border-b border-white/5 pb-2">
                        <span className="truncate pr-2 font-medium">{ing.inventoryItem?.name || 'Неизвестно (Удалено)'}</span>
                        <span className="text-white font-bold shrink-0">{ing.quantity} <span className="text-white/40 font-normal">{ing.inventoryItem?.unit || 'шт'}</span></span>
                      </div>
                    )) : (
                       <div className="italic opacity-50 text-center py-2">Пусто</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <RecipeModal 
        isOpen={editingRecipe.isOpen}
        onClose={() => setEditingRecipe({isOpen: false, recipe: null})}
        recipe={editingRecipe.recipe}
      />

      {deletingRecipe && (
        <ConfirmModal
           title="Удалить рецепт?"
           message={`Точно удалить рецепт "${deletingRecipe.name}"?`}
           onConfirm={() => deleteRecipe(deletingRecipe.id)}
           onCancel={() => setDeletingRecipe(null)}
        />
      )}
    </div>
  );
}
