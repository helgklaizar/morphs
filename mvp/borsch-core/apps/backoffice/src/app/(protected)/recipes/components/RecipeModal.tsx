import { useState, useEffect } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { Recipe, useRecipesStore, useInventoryStore } from "@rms/core";

interface RecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe?: Recipe | null;
}

export function RecipeModal({ isOpen, onClose, recipe }: RecipeModalProps) {
  const { saveRecipe } = useRecipesStore();
  const { items: inventoryItems, categories } = useInventoryStore();

  const [name, setName] = useState("");
  const [portions, setPortions] = useState(1);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [packaging, setPackaging] = useState<any[]>([]);

  const isPackagingItem = (itemId: string) => {
    const it = inventoryItems.find(i => i.id === itemId);
    if (!it) return false;
    const cat = categories.find(c => c.id === it.categoryId);
    return cat ? cat.name.toLowerCase().includes('хоз') : false;
  };

  useEffect(() => {
    if (recipe) {
      setName(recipe.name);
      setPortions(recipe.portions || 1);
      
      const allIngs = recipe.ingredients.map(i => ({
        id: crypto.randomUUID(), 
        inventoryItemId: i.inventoryItemId,
        quantity: i.quantity
      }));
      
      setPackaging(allIngs.filter(i => isPackagingItem(i.inventoryItemId)));
      setIngredients(allIngs.filter(i => !isPackagingItem(i.inventoryItemId)));
    } else {
      setName("");
      setPortions(1);
      setIngredients([]);
      setPackaging([]);
    }
  }, [recipe, isOpen, inventoryItems, categories]);

  if (!isOpen) return null;

  const addIngredient = (isPack: boolean) => {
    const newIt = { id: crypto.randomUUID(), inventoryItemId: "", quantity: 0 };
    if (isPack) setPackaging([...packaging, newIt]);
    else setIngredients([...ingredients, newIt]);
  };

  const updateItem = (id: string, field: string, value: any, isPack: boolean) => {
    if (isPack) setPackaging(packaging.map(i => i.id === id ? { ...i, [field]: value } : i));
    else setIngredients(ingredients.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const removeItem = (id: string, isPack: boolean) => {
    if (isPack) setPackaging(packaging.filter(i => i.id !== id));
    else setIngredients(ingredients.filter(i => i.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    // Filter valid ingredients
    const validIngredients = [...ingredients, ...packaging]
      .filter(i => i.inventoryItemId && Number(i.quantity) > 0)
      .map(i => ({ inventoryItemId: i.inventoryItemId, quantity: Number(i.quantity) }));

    await saveRecipe({ id: recipe?.id, name, portions }, validIngredients);
    onClose();
  };

  const packItemsList = inventoryItems.filter(i => isPackagingItem(i.id));
  const foodItemsList = inventoryItems.filter(i => !isPackagingItem(i.id));

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-5 border-b border-white/5">
          <h2 className="text-xl font-bold">{recipe ? "Редактировать рецепт" : "Новый рецепт"}</h2>
          <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-white/50 uppercase">Название блюда</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-colors"
              placeholder="Например: Борщ или Заготовка теста"
            />
          </div>

          {/* ИНГРЕДИЕНТЫ */}
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-end pb-2 border-b border-white/5">
              <label className="text-sm font-bold text-indigo-400 uppercase tracking-wider">Ингредиенты (Продукты)</label>
              <button
                type="button"
                onClick={() => addIngredient(false)}
                className="text-xs bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 px-3 py-1.5 rounded-lg flex items-center gap-1 font-bold transition-colors"
              >
                <Plus className="w-3 h-3" /> Добавить
              </button>
            </div>

            {ingredients.length === 0 ? (
              <div className="text-center py-4 text-white/30 text-sm border border-dashed border-white/10 rounded-xl">
                Нет ингредиентов
              </div>
            ) : (
              <div className="space-y-3">
                {ingredients.map(ing => (
                  <div key={ing.id} className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                    <select
                      value={ing.inventoryItemId}
                      onChange={(e) => updateItem(ing.id, 'inventoryItemId', e.target.value, false)}
                      required
                      className="flex-1 bg-black border border-white/10 rounded-lg px-3 py-2 text-sm outline-none w-0"
                    >
                      <option value="">Выберите товар...</option>
                      {foodItemsList.map(item => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>

                    {(() => {
                      const selectedItem = inventoryItems.find(i => i.id === ing.inventoryItemId);
                      const unit = selectedItem?.unit || 'шт';
                      return (
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Кол-во"
                            required
                            value={ing.quantity || ""}
                            onChange={(e) => updateItem(ing.id, 'quantity', e.target.value, false)}
                            className="w-28 bg-black border border-white/10 rounded-lg pl-3 pr-8 py-2 text-sm outline-none shrink-0"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase font-bold text-white/30 pointer-events-none">
                            {unit}
                          </span>
                        </div>
                      );
                    })()}

                    <button
                      type="button"
                      onClick={() => removeItem(ing.id, false)}
                      className="p-2 text-red-400/50 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 bg-indigo-500/10 p-4 rounded-xl border border-indigo-500/20 mt-1">
              <label className="text-[13px] font-bold text-indigo-300 uppercase flex-1 leading-tight">
                Количество выходящих порций
              </label>
              <input
                type="number"
                min="1"
                step="1"
                required
                value={portions}
                onChange={(e) => setPortions(Number(e.target.value))}
                className="w-24 bg-black border border-white/10 rounded-lg px-3 py-2 text-sm outline-none text-center font-bold text-white"
              />
            </div>
          </div>

          {/* ТЕК-АВЕЙ */}
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-end pb-2 border-b border-white/5">
              <label className="text-sm font-bold text-emerald-400 uppercase tracking-wider">Take Away (Упаковка)</label>
              <button
                type="button"
                onClick={() => addIngredient(true)}
                className="text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 px-3 py-1.5 rounded-lg flex items-center gap-1 font-bold transition-colors"
              >
                <Plus className="w-3 h-3" /> Добавить упаковку
              </button>
            </div>

            {packaging.length === 0 ? (
              <div className="text-center py-4 text-white/30 text-sm border border-dashed border-white/10 rounded-xl">
                Нет упаковки
              </div>
            ) : (
              <div className="space-y-3">
                {packaging.map(ing => (
                  <div key={ing.id} className="flex items-center gap-3 bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10">
                    <select
                      value={ing.inventoryItemId}
                      onChange={(e) => updateItem(ing.id, 'inventoryItemId', e.target.value, true)}
                      required
                      className="flex-1 bg-black border border-white/10 rounded-lg px-3 py-2 text-sm outline-none w-0"
                    >
                      <option value="">Выберите упаковку...</option>
                      {packItemsList.map(item => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>

                    {(() => {
                      const selectedItem = inventoryItems.find(i => i.id === ing.inventoryItemId);
                      const unit = selectedItem?.unit || 'шт';
                      return (
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            placeholder="Кол-во"
                            required
                            value={ing.quantity || ""}
                            onChange={(e) => updateItem(ing.id, 'quantity', e.target.value, true)}
                            className="w-28 bg-black border border-white/10 rounded-lg pl-3 pr-8 py-2 text-sm outline-none shrink-0"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase font-bold text-emerald-400/50 pointer-events-none">
                            {unit}
                          </span>
                        </div>
                      );
                    })()}

                    <button
                      type="button"
                      onClick={() => removeItem(ing.id, true)}
                      className="p-2 text-red-400/50 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>

        <div className="p-5 border-t border-white/5 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition-colors"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-indigo-500/20"
          >
            {recipe ? "Сохранить" : "Создать рецепт"}
          </button>
        </div>
      </div>
    </div>
  );
}
