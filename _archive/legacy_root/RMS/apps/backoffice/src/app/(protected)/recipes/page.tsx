"use client";

import { useEffect, useState } from "react";
import { Plus, BookOpen, Edit3, X, Trash2 } from "lucide-react";
import { useRecipesStore, Recipe, RecipeIngredient } from "@/store/useRecipesStore";
import { useInventoryStore, InventoryItem } from "@/store/useInventoryStore";
import { ConfirmModal } from "@/components/ConfirmModal";

export default function RecipesPage() {
  const { 
    recipes, 
    isLoading, 
    fetchRecipes, 
    subscribeToRecipes, 
    unsubscribeFromRecipes, 
    saveRecipe,
    deleteRecipe,
    calculateRecipeCost
  } = useRecipesStore();
  const { categories, fetchInventory } = useInventoryStore();

  const [isModalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [name, setName] = useState("");
  const [portions, setPortions] = useState(1);
  const [ingredients, setIngredients] = useState<{ 
    inventoryItemId?: string, 
    nestedRecipeId?: string, 
    quantity: number 
  }[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string, name: string } | null>(null);

  useEffect(() => {
    fetchRecipes();
    fetchInventory();
    subscribeToRecipes();
    return () => unsubscribeFromRecipes();
  }, [fetchRecipes, subscribeToRecipes, unsubscribeFromRecipes, fetchInventory]);

  const openAddModal = () => {
    setEditingId(null);
    setName("");
    setPortions(1);
    setIngredients([]);
    setModalOpen(true);
  };

  const openEditModal = (recipe: Recipe) => {
    setEditingId(recipe.id);
    setName(recipe.name);
    setPortions(recipe.portions);
    setIngredients(recipe.ingredients.map(ing => ({ 
      inventoryItemId: ing.inventoryItemId, 
      nestedRecipeId: ing.nestedRecipeId,
      quantity: ing.quantity 
    })));
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    try {
      await saveRecipe(editingId, name.trim(), portions, ingredients);
      setModalOpen(false);
    } catch (e) {
      // Error handled by store alert
    }
  };

  const handleDelete = async (id: string, rName: string) => {
    setConfirmDelete({ id, name: rName });
  };

  const allInventoryItems = categories.flatMap(c => c.items);
  const availableInventoryItems = categories.filter(c => c.isVisibleInRecipe).flatMap(c => c.items);
  
  // Exclude current recipe from potential sub-recipes list to prevent infinite loops
  const otherRecipes = recipes.filter(r => r.id !== editingId);

  const calculateTempModalCost = () => {
    let total = 0;
    ingredients.forEach(ing => {
      if (ing.inventoryItemId) {
        const item = allInventoryItems.find(i => i.id === ing.inventoryItemId);
        if (item) {
          const yieldFactor = item.yieldPerUnit || 1;
          total += ing.quantity * (item.price / yieldFactor);
        }
      } else if (ing.nestedRecipeId) {
        const sub = recipes.find(r => r.id === ing.nestedRecipeId);
        if (sub) {
          const subCost = calculateRecipeCost(sub.id);
          total += (subCost / (sub.portions || 1)) * ing.quantity;
        }
      }
    });
    return total;
  };

  const totalModalCost = calculateTempModalCost();
  const modalCostPerPortion = portions > 0 ? totalModalCost / portions : 0;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Рецепты V3</h1>
          <p className="text-sm text-gray-400 mt-1">ТТК с поддержкой вложенных полуфабрикатов (ПФ)</p>
        </div>
        <button 
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold shadow-lg shadow-orange-500/20 transition-all hover:scale-105 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Создать ТТК
        </button>
      </div>

      <div className="flex-1 overflow-auto pb-10">
        {isLoading && recipes.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center w-full">
            <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin mb-4" />
            <p className="text-xl font-semibold text-gray-500">Загрузка рецептов...</p>
          </div>
        ) : recipes.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center w-full">
            <BookOpen className="h-16 w-16 text-[#2A2A2A] mb-4" />
            <p className="text-xl font-semibold text-gray-500">Рецептов пока нет</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-1">
            {recipes.map(recipe => (
              <RecipeCard 
                key={recipe.id} 
                recipe={recipe} 
                cost={calculateRecipeCost(recipe.id)}
                onEdit={() => openEditModal(recipe)} 
                onDelete={() => handleDelete(recipe.id, recipe.name)} 
              />
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="bg-[#141414] rounded-2xl p-6 w-full max-w-xl border border-white/10 shadow-2xl relative animate-in fade-in slide-in-from-bottom-4 duration-300 flex flex-col max-h-[90vh]">
            <button onClick={() => setModalOpen(false)} className="absolute top-4 right-4 text-white/50 hover:text-white bg-white/5 p-2 rounded-full transition-colors">
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-bold mb-4 text-white">{editingId ? 'Редактировать ТТК' : 'Новое ТТК'}</h2>
            
            <div className="space-y-6 overflow-y-auto flex-1 pr-2 custom-scrollbar">
              <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-1.5 block">Название блюда / ПФ</label>
                  <input 
                    type="text" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    className="w-full bg-[#1a1a1a] rounded-xl px-4 py-3 text-sm outline-none border border-white/5 focus:border-orange-500 transition-all font-medium text-white" 
                    placeholder="Например: Фарш свиной" 
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-1.5 block">Выход (порций)</label>
                  <input 
                    type="number" 
                    min={1} 
                    value={portions} 
                    onChange={e => setPortions(parseFloat(e.target.value))} 
                    className="w-full bg-[#1a1a1a] rounded-xl px-4 py-3 text-sm outline-none border border-white/5 focus:border-orange-500 transition-all font-medium text-white" 
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-gray-500 block">Состав ингредиентов</label>
                </div>
                <div className="space-y-3 mb-4">
                  {ingredients.map((ing, idx) => (
                    <RecipeIngredientRow
                      key={idx}
                      ingredient={ing}
                      allInventoryItems={allInventoryItems}
                      availableInventoryItems={availableInventoryItems}
                      otherRecipes={otherRecipes}
                      onUpdate={(newItemId, newNestedId, newQuantity) => {
                        const newIngs = [...ingredients];
                        newIngs[idx] = { inventoryItemId: newItemId || undefined, nestedRecipeId: newNestedId || undefined, quantity: newQuantity || 0 };
                        setIngredients(newIngs);
                      }}
                      onRemove={() => setIngredients(ingredients.filter((_, i) => i !== idx))}
                    />
                  ))}
                  {ingredients.length === 0 && (
                    <div className="text-center py-6 border-2 border-dashed border-white/5 rounded-2xl bg-white/[0.02]">
                       <p className="text-sm text-gray-500">Добавьте продукты или другие ПФ в состав</p>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setIngredients([...ingredients, { inventoryItemId: "", quantity: 1 }])} 
                    className="flex-1 bg-white/[0.05] hover:bg-white/[0.1] rounded-xl py-3 text-xs text-white/70 font-semibold transition-all flex justify-center items-center gap-2 border border-white/5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Добавить продукт
                  </button>
                  <button 
                    onClick={() => setIngredients([...ingredients, { nestedRecipeId: "", quantity: 1 }])} 
                    className="flex-1 bg-orange-500/10 hover:bg-orange-500/20 rounded-xl py-3 text-xs text-orange-500 font-bold transition-all flex justify-center items-center gap-2 border border-orange-500/20"
                  >
                    <BookOpen className="w-3.5 h-3.5" /> Из другого ПФ
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-white/5 bg-[#141414]">
              <div className="flex justify-between items-center mb-5 bg-white/[0.02] p-4 rounded-xl border border-white/5">
                <span className="text-xs text-gray-400 font-medium">Себестоимость на 1 порцию:</span>
                <div className="text-right">
                  <div className="text-xl font-black text-orange-500">{modalCostPerPortion.toFixed(2)} ₪</div>
                  <div className="text-[10px] uppercase tracking-widest text-gray-500 mt-1">Итого (все порции): {totalModalCost.toFixed(2)} ₪</div>
                </div>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => setModalOpen(false)} 
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-xl text-sm transition-all"
                >
                  Отмена
                </button>
                <button 
                  onClick={handleSave} 
                  className="flex-[1.5] bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-xl text-sm shadow-xl shadow-orange-500/10 transition-all hover:scale-[1.02] active:scale-95"
                >
                  Сохранить рецепт
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Удалить версию ТТК?"
          message={`Вы уверены, что хотите удалить "${confirmDelete.name}"? Если этот ПФ используется в других рецептах, их себестоимость может стать некорректной.`}
          onConfirm={() => deleteRecipe(confirmDelete.id)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

function RecipeIngredientRow({ 
  ingredient, 
  allInventoryItems, 
  availableInventoryItems,
  otherRecipes,
  onUpdate, 
  onRemove 
}: { 
  ingredient: { inventoryItemId?: string, nestedRecipeId?: string, quantity: number }, 
  allInventoryItems: InventoryItem[], 
  availableInventoryItems: InventoryItem[],
  otherRecipes: Recipe[],
  onUpdate: (itemId?: string, nestedId?: string, qty?: number) => void, 
  onRemove: () => void 
}) {
  const [displayQty, setDisplayQty] = useState(ingredient.quantity.toString());
  const [displayUnit, setDisplayUnit] = useState<string>("default");

  const isProduct = ingredient.inventoryItemId !== undefined;
  const isRecipe = ingredient.nestedRecipeId !== undefined;

  const selectedItem = isProduct ? allInventoryItems.find(i => i.id === ingredient.inventoryItemId) : null;
  const selectedRecipe = isRecipe ? otherRecipes.find(r => r.id === ingredient.nestedRecipeId) : null;
  
  const baseUnit = isRecipe ? 'порц' : (selectedItem?.recipeUnit || selectedItem?.unit || 'шт');

  useEffect(() => {
    setDisplayQty(ingredient.quantity.toString());
    setDisplayUnit("default");
  }, [ingredient.inventoryItemId, ingredient.nestedRecipeId]);

  const handleQtyChange = (val: string, unitMode: string) => {
    if (val === "" || val === "-") {
        setDisplayQty(val);
        return;
    }
    setDisplayQty(val);
    setDisplayUnit(unitMode);
    
    let parsed = parseFloat(val) || 0;
    if (unitMode === "g" && baseUnit === "кг") parsed = parsed / 1000;
    if (unitMode === "ml" && baseUnit === "л") parsed = parsed / 1000;
    
    onUpdate(ingredient.inventoryItemId, ingredient.nestedRecipeId, parsed);
  };

  const handleSelectUnit = (unitMode: string) => {
    let newDisplay = ingredient.quantity;
    if (unitMode === "g" && baseUnit === "кг") newDisplay = newDisplay * 1000;
    if (unitMode === "ml" && baseUnit === "л") newDisplay = newDisplay * 1000;
    
    setDisplayUnit(unitMode);
    setDisplayQty(parseFloat(newDisplay.toFixed(3)).toString());
  };

  return (
    <div className="flex gap-3 items-center group bg-white/[0.03] p-2 rounded-xl transition-all hover:bg-white/[0.05] border border-white/5">
      {isProduct ? (
        <div className="flex-1 min-w-[140px] relative">
          <select 
            value={ingredient.inventoryItemId} 
            onChange={e => onUpdate(e.target.value, undefined, 0)}
            className="w-full bg-[#1a1a1a] rounded-lg px-3 py-2.5 text-xs border border-white/5 outline-none font-medium appearance-none"
          >
            <option value="" disabled>Выберите продукт...</option>
            {availableInventoryItems.map(item => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
             <div className="w-1.5 h-1.5 border-b-2 border-r-2 border-white rotate-45" />
          </div>
        </div>
      ) : (
        <div className="flex-1 min-w-[140px] relative">
          <select 
            value={ingredient.nestedRecipeId} 
            onChange={e => onUpdate(undefined, e.target.value, 0)}
            className="w-full bg-orange-500/5 text-orange-400 rounded-lg px-3 py-2.5 text-xs border border-orange-500/10 outline-none font-bold appearance-none"
          >
            <option value="" disabled>Выберите ПФ...</option>
            {otherRecipes.map(r => (
              <option key={r.id} value={r.id}>ПФ: {r.name}</option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
             <div className="w-1.5 h-1.5 border-b-2 border-r-2 border-orange-400 rotate-45" />
          </div>
        </div>
      )}
      
      <div className="flex items-center gap-1.5 bg-[#1a1a1a] rounded-lg border border-white/5 p-1 px-2 shrink-0">
        <input 
          type="number" step="0.001" value={displayQty} 
          onChange={e => handleQtyChange(e.target.value, displayUnit)}
          className="w-14 bg-transparent text-[13px] outline-none text-center font-bold text-white" 
        />
        
        {isProduct ? (
            <select 
                value={displayUnit}
                onChange={e => handleSelectUnit(e.target.value)}
                className="bg-transparent text-[11px] font-bold text-gray-500 outline-none cursor-pointer"
            >
                <option value="default">{baseUnit}</option>
                {baseUnit === 'кг' && <option value="g">г</option>}
                {baseUnit === 'л' && <option value="ml">мл</option>}
            </select>
        ) : (
            <span className="text-[11px] font-bold text-gray-500 px-1">порц.</span>
        )}
      </div>
      
      <button onClick={onRemove} className="text-white/20 hover:text-red-500 p-2 rounded-lg transition-all hover:bg-red-500/10 active:scale-90">
        <Trash2 className="w-4.5 h-4.5" />
      </button>
    </div>
  );
}

function RecipeCard({ 
  recipe, 
  cost, 
  onEdit, 
  onDelete 
}: { 
  recipe: Recipe, 
  cost: number,
  onEdit: () => void, 
  onDelete: () => void 
}) {
  const costPerPortion = recipe.portions > 0 ? cost / recipe.portions : 0;

  return (
    <div className="flex flex-col bg-[#141414] rounded-2xl border border-white/10 overflow-hidden hover:border-orange-500/30 transition-all hover:shadow-xl hover:shadow-orange-500/5 group relative">
      <div className="flex items-center px-4 py-4 bg-white/[0.02] border-b border-white/5">
        <div className="p-2.5 rounded-xl bg-orange-500/10 mr-3 shrink-0">
            <BookOpen className="w-5 h-5 text-orange-500" />
        </div>
        <h3 className="font-bold text-base flex-1 truncate text-white">{recipe.name}</h3>
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="text-white/40 hover:text-orange-500 transition-colors w-9 h-9 flex items-center justify-center rounded-xl hover:bg-orange-500/10">
            <Edit3 className="w-4 h-4" />
          </button>
          <button onClick={onDelete} className="text-white/40 hover:text-red-500 transition-colors w-9 h-9 flex items-center justify-center rounded-xl hover:bg-red-500/10">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="flex flex-col flex-1 p-4 pt-3 gap-3">
        <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-600 mb-1.5 block">Состав ({recipe.ingredients.length}):</span>
            <div className="space-y-1.5 overflow-y-auto max-h-[120px] pr-1 custom-scrollbar">
            {recipe.ingredients.length === 0 ? (
                <span className="text-xs text-white/10 italic">Пустой рецепт</span>
            ) : (
                recipe.ingredients.map((ing, i) => (
                <div key={ing.id || i} className="flex justify-between items-center text-[11px]">
                    <span className={`truncate pr-2 ${ing.nestedRecipeId ? 'text-orange-400 font-bold' : 'text-gray-400'}`}>
                        {ing.nestedRecipeId ? `📦 ${ing.nestedRecipe?.name || 'ПФ'}` : ing.inventoryItem?.name || '❓'}
                    </span>
                    <span className="text-gray-500 font-medium whitespace-nowrap">
                        {ing.quantity} {ing.nestedRecipeId ? 'порц' : (ing.inventoryItem?.recipeUnit || ing.inventoryItem?.unit || '')}
                    </span>
                </div>
                ))
            )}
            </div>
        </div>
      </div>
      
      <div className="px-4 py-3.5 mt-auto border-t border-white/5 flex justify-between items-end bg-gradient-to-t from-white/[0.01] to-transparent">
        <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{recipe.portions} ПОРЦ.</span>
            <span className="text-white/30 text-[10px]">Итого: {cost.toFixed(2)} ₪</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-orange-500 font-black text-lg leading-tight">{costPerPortion.toFixed(2)} <span className="text-[10px] text-orange-500/60 ml-0.5">₪/п</span></span>
        </div>
      </div>
    </div>
  );
}
