"use client";

import { useEffect, useState } from "react";
import { Plus, BookOpen, Edit3, X, Trash2 } from "lucide-react";
import { useRecipesStore, Recipe, RecipeIngredient } from "@/store/useRecipesStore";
import { useInventoryStore, InventoryItem } from "@/store/useInventoryStore";
import { ConfirmModal } from "@/components/ConfirmModal";

export default function RecipesPage() {
  const { recipes, isLoading, fetchRecipes, subscribeToRecipes, unsubscribeFromRecipes, addRecipe, updateRecipe, deleteRecipe } = useRecipesStore();
  const { categories, fetchInventory } = useInventoryStore();

  const [isModalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [name, setName] = useState("");
  const [portions, setPortions] = useState(1);
  const [ingredients, setIngredients] = useState<{ inventoryItemId: string, quantity: number }[]>([]);
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
    setIngredients(recipe.ingredients.map(ing => ({ inventoryItemId: ing.inventoryItemId, quantity: ing.quantity })));
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    try {
      if (editingId) {
        await updateRecipe(editingId, name.trim(), portions, ingredients);
      } else {
        await addRecipe(name.trim(), portions, ingredients);
      }
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
  const totalModalCost = ingredients.reduce((sum, ing) => {
    const item = allInventoryItems.find(i => i.id === ing.inventoryItemId);
    const price = item?.price || 0;
    const yieldFactor = item?.yieldPerUnit || 1;
    return sum + (ing.quantity * (price / yieldFactor));
  }, 0);
  const modalCostPerPortion = portions > 0 ? totalModalCost / portions : 0;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Рецепты</h1>
          <p className="text-sm text-muted-foreground mt-1">ТТК и калькуляция блюд</p>
        </div>
        <button 
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition-colors"
        >
          <Plus className="w-4 h-4" />
          Создать
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {recipes.map(recipe => (
              <RecipeCard key={recipe.id} recipe={recipe} onEdit={() => openEditModal(recipe)} onDelete={() => handleDelete(recipe.id, recipe.name)} />
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="bg-[#1a1a1a] rounded-2xl p-6 w-full max-w-lg border border-white/10 shadow-2xl relative animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <button onClick={() => setModalOpen(false)} className="absolute top-4 right-4 text-white/50 hover:text-white">
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-bold mb-4">{editingId ? 'Редактировать рецепт' : 'Новый рецепт'}</h2>
            
            <div className="space-y-4 overflow-y-auto flex-1 pr-2">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="text-xs text-white/50 mb-1 block">Название блюда</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-[#242424] rounded-lg px-4 py-2.5 text-sm outline-none border border-white/5 focus:border-orange-500" placeholder="Борщ" />
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Порции</label>
                  <input type="number" min={1} value={portions} onChange={e => setPortions(parseFloat(e.target.value))} className="w-full bg-[#242424] rounded-lg px-4 py-2.5 text-sm outline-none border border-white/5 focus:border-orange-500" />
                </div>
              </div>

              <div>
                <label className="text-xs text-white/50 mb-2 block">Состав (Ингредиенты)</label>
                <div className="space-y-2 mb-3">
                  {ingredients.map((ing, idx) => (
                    <RecipeIngredientRow
                      key={idx}
                      ingredient={ing}
                      allInventoryItems={allInventoryItems}
                      availableInventoryItems={availableInventoryItems}
                      onUpdate={(newItemId, newQuantity) => {
                        const newIngs = [...ingredients];
                        newIngs[idx] = { inventoryItemId: newItemId, quantity: newQuantity };
                        setIngredients(newIngs);
                      }}
                      onRemove={() => setIngredients(ingredients.filter((_, i) => i !== idx))}
                    />
                  ))}
                </div>
                <button onClick={() => setIngredients([...ingredients, { inventoryItemId: "", quantity: 1 }])} className="w-full bg-white/5 hover:bg-white/10 rounded-lg py-2 text-sm text-white/80 transition-colors flex justify-center items-center gap-2">
                  <Plus className="w-4 h-4" /> Добавить продукт
                </button>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/5">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-white/60">Предпросмотр себестоимости:</span>
                <div className="text-right">
                  <div className="text-lg font-bold text-orange-500">{modalCostPerPortion.toFixed(2)} ₪/порция</div>
                  <div className="text-xs text-white/40">Итого: {totalModalCost.toFixed(2)} ₪</div>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setModalOpen(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-lg text-sm transition-colors">Отмена</button>
                <button onClick={handleSave} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-lg text-sm transition-colors">Сохранить</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Удалить рецепт?"
          message={`Точно удалить рецепт "${confirmDelete.name}"? Это действие необратимо.`}
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
  onUpdate, 
  onRemove 
}: { 
  ingredient: { inventoryItemId: string, quantity: number }, 
  allInventoryItems: InventoryItem[], 
  availableInventoryItems: InventoryItem[],
  onUpdate: (id: string, qty: number) => void, 
  onRemove: () => void 
}) {
  const [displayQty, setDisplayQty] = useState(ingredient.quantity.toString());
  const [displayUnit, setDisplayUnit] = useState<string>("default");

  const selectedItem = allInventoryItems.find(i => i.id === ingredient.inventoryItemId);
  const baseUnit = selectedItem?.recipeUnit || selectedItem?.unit || 'шт';

  useEffect(() => {
    setDisplayQty(ingredient.quantity.toString());
    setDisplayUnit("default");
  }, [ingredient.inventoryItemId]);

  const handleQtyChange = (val: string, unitMode: string) => {
    setDisplayQty(val);
    setDisplayUnit(unitMode);
    
    let parsed = parseFloat(val) || 0;
    if (unitMode === "g" && baseUnit === "кг") parsed = parsed / 1000;
    if (unitMode === "ml" && baseUnit === "л") parsed = parsed / 1000;
    
    onUpdate(ingredient.inventoryItemId, parsed);
  };

  const handleSelectUnit = (unitMode: string) => {
    // If we changed unit, we recalculate display qty based on TRUE quantity
    let newDisplay = ingredient.quantity;
    if (unitMode === "g" && baseUnit === "кг") newDisplay = newDisplay * 1000;
    if (unitMode === "ml" && baseUnit === "л") newDisplay = newDisplay * 1000;
    
    setDisplayUnit(unitMode);
    setDisplayQty(parseFloat(newDisplay.toFixed(3)).toString());
  };

  return (
    <div className="flex gap-2 items-center mb-2">
      <select 
        value={ingredient.inventoryItemId} 
        onChange={e => onUpdate(e.target.value, 0)}
        className="flex-1 bg-[#242424] rounded-lg px-3 py-2 text-[13px] border border-white/5 outline-none max-w-[200px]"
      >
        <option value="" disabled>Продукт...</option>
        {availableInventoryItems.map(item => (
          <option key={item.id} value={item.id}>{item.name} ({item.price} ₪/{item.unit})</option>
        ))}
        {selectedItem && !availableInventoryItems.some(i => i.id === selectedItem.id) && (
          <option key={selectedItem.id} value={selectedItem.id}>{selectedItem.name} ({selectedItem.price} ₪/{selectedItem.unit})</option>
        )}
      </select>
      
      <input 
        type="number" step="0.001" value={displayQty} 
        onChange={e => handleQtyChange(e.target.value, displayUnit)}
        className="w-16 bg-[#242424] rounded-lg px-2 py-2 text-[13px] border border-white/5 outline-none text-center" 
      />
      
      <select 
        value={displayUnit}
        onChange={e => handleSelectUnit(e.target.value)}
        className="w-16 bg-[#242424] rounded-lg px-1 py-2 text-[13px] border border-white/5 outline-none"
      >
        <option value="default">{baseUnit}</option>
        {baseUnit === 'кг' && <option value="g">г</option>}
        {baseUnit === 'л' && <option value="ml">мл</option>}
      </select>
      
      <button onClick={onRemove} className="text-white/40 hover:bg-white/10 hover:text-red-400 p-2 rounded-lg transition-colors">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

function RecipeCard({ recipe, onEdit, onDelete }: { recipe: Recipe, onEdit: () => void, onDelete: () => void }) {
  const totalCost = recipe.ingredients.reduce((sum, ing) => {
    const price = ing.inventoryItem?.price || 0;
    const yieldFactor = ing.inventoryItem?.yieldPerUnit || 1;
    return sum + (ing.quantity * (price / yieldFactor));
  }, 0);
  
  const costPerPortion = recipe.portions > 0 ? totalCost / recipe.portions : 0;

  return (
    <div className="flex flex-col bg-[#141414] rounded-2xl border border-white/10 overflow-hidden hover:border-white/20 transition-colors">
      <div className="flex items-center px-4 py-3.5 bg-orange-500/10 border-b border-orange-500/10">
        <BookOpen className="w-5 h-5 text-orange-500 mr-3 shrink-0" />
        <h3 className="font-bold text-base flex-1 truncate">{recipe.name}</h3>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={onEdit} className="text-orange-500 hover:text-orange-400 transition-colors w-7 h-7 flex items-center justify-center rounded-lg bg-white/5">
            <Edit3 className="w-4 h-4" />
          </button>
          <button onClick={onDelete} className="text-red-500 hover:text-red-400 transition-colors w-7 h-7 flex items-center justify-center rounded-lg bg-white/5">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="flex flex-col flex-1 p-4 pt-3">
        <span className="text-xs text-white/40 mb-2">Состав:</span>
        <div className="flex-1 space-y-1 overflow-y-auto max-h-[140px]">
          {recipe.ingredients.length === 0 ? (
            <span className="text-xs text-white/30">Нет ингредиентов</span>
          ) : (
            recipe.ingredients.map(ing => (
              <div key={ing.id} className="flex justify-between items-center text-xs">
                <span className="text-white/80 truncate pr-2">{ing.inventoryItem?.name || '?'}</span>
                <span className="text-white/50 shrink-0">{ing.quantity} {ing.inventoryItem?.recipeUnit || ing.inventoryItem?.unit || ''}</span>
              </div>
            ))
          )}
        </div>
      </div>
      
      <div className="px-4 py-3 border-t border-white/5 flex justify-between items-center">
        <span className="text-xs text-white/40">{recipe.portions} порц.</span>
        <div className="flex flex-col items-end">
          <span className="text-orange-500 font-bold text-sm">{costPerPortion.toFixed(2)} ₪/порц.</span>
          <span className="text-white/40 text-[10px]">Итого: {totalCost.toFixed(2)} ₪</span>
        </div>
      </div>
    </div>
  );
}
