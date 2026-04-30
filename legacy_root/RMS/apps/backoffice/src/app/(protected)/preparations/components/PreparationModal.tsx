"use client";

import { useState, useEffect } from "react";
import { X, Trash2, Image as ImageIcon, Plus, Minus } from "lucide-react";
import { MenuItem, useMenuStore } from "@/store/useMenuStore";
import { useInventoryStore } from "@/store/useInventoryStore";
import { useRecipesStore } from "@/store/useRecipesStore";
import { ConfirmModal } from "@/components/ConfirmModal";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  item: MenuItem | null;
}

export function PreparationModal({ isOpen, onClose, item }: Props) {
  const { saveWithRecipe, deleteMenuItem } = useMenuStore();
  const { categories: inventoryCategories, fetchInventory } = useInventoryStore();
  const { recipes, fetchRecipes } = useRecipesStore();

  const inventoryItems = inventoryCategories.flatMap(c => c.items);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [unit, setUnit] = useState("мл");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [writeOffOnProduce, setWriteOffOnProduce] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Ingredients for the underlying recipe
  const [ingredients, setIngredients] = useState<{inventoryItemId: string, quantity: number, id: string}[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchInventory();
      fetchRecipes();
      
      setName(item?.name || "");
      setDescription(item?.description || "");
      setUnit(item?.unit || "мл");
      setImageUrl(item?.image || "");
      setImageFile(null);
      setWriteOffOnProduce(item?.writeOffOnProduce || false);
      
      if (item?.recipeId) {
        // Find existing recipe ingredients from recipes store if they are loaded somewhere?
        // Wait, recipes store doesn't load recipe_ingredients directly for us to map.
        // Actually, we must fetch recipe_ingredients if item exists.
      } else {
        setIngredients([]);
      }
    }
  }, [isOpen, item]);

  // Handle recipe fetching locally
  useEffect(() => {
    async function loadIngredients() {
      if (item?.recipeId && isOpen) {
        const { pb } = await import("@/lib/pocketbase");
        const recIngs = await pb.collection('recipe_ingredients').getFullList({ filter: `recipe_id = "${item.recipeId}"` });
        setIngredients(recIngs.map(r => ({
          id: crypto.randomUUID(),
          inventoryItemId: r.inventory_item_id,
          quantity: r.quantity
        })));
      }
    }
    loadIngredients();
  }, [isOpen, item?.recipeId]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!name.trim()) return;
    
    // Save the preparation and its ingredients using the new function
    await saveWithRecipe({
      id: item?.id,
      name: name.trim(),
      description: description.trim(),
      isPrep: true,
      unit,
      writeOffOnProduce,
      image: imageUrl.trim(),
      imageFile: imageFile || undefined,
      recipeId: item?.recipeId || undefined,
      // Default placeholder fields for preparations
      price: 0,
    }, ingredients.map(i => ({ inventoryItemId: i.inventoryItemId, quantity: i.quantity })));
    
    onClose();
  };

  const addIngredient = () => {
    if (inventoryItems.length === 0) return;
    setIngredients([...ingredients, { id: crypto.randomUUID(), inventoryItemId: inventoryItems[0].id, quantity: 1 }]);
  };

  const removeIngredient = (id: string) => {
    setIngredients(ingredients.filter(i => i.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-xl border border-white/10 shadow-2xl relative animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        
        <div className="p-6 border-b border-white/5 flex justify-between items-center shrink-0">
            <h2 className="text-xl font-bold">{item ? 'Редактировать заготовку' : 'Новая заготовка'}</h2>
            <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
                <X className="h-5 w-5" />
            </button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          <div>
            <label className="text-xs text-white/50 mb-1 block">Название заготовки *</label>
            <input 
              type="text" value={name} onChange={e => setName(e.target.value)}
              className="w-full bg-[#242424] rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 border border-white/5"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-white/50 mb-1 block">Ед. измерения</label>
              <input 
                type="text" value={unit} onChange={e => setUnit(e.target.value)}
                placeholder="мл, гр, шт"
                className="w-full bg-[#242424] rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 border border-white/5 font-bold"
              />
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex gap-4 items-start">
             <label className="relative flex items-start gap-3 cursor-pointer pt-1">
                <input 
                  type="checkbox" checked={writeOffOnProduce} onChange={e => setWriteOffOnProduce(e.target.checked)}
                  className="w-5 h-5 accent-orange-500 rounded border-white/20 mt-0.5"
                />
                <div className="flex flex-col">
                   <span className="text-sm font-bold text-orange-500 tracking-wide uppercase">Списывать сырье только при ручной варке</span>
                   <span className="text-xs text-white/50 mt-1 max-w-[400px] leading-relaxed">
                     <strong className="text-white">ВКЛ:</strong> У заготовки будет остаток. Ты вручную жмешь "Сварить 10 литров", сырье списывается, остаток заготовки +10. При продаже блюда с этой заготовкой - вычитается остаток из заготовки, <b>а не со склада.</b><br/>
                     <strong className="text-white">ВЫКЛ:</strong> Виртуальная (готовится из-под ножа). Остаток не ведется. При продаже блюда с этой заготовкой, система пробивает её насквозь и списывает сырье (указанное ниже) со склада.
                   </span>
                </div>
             </label>
          </div>

          <div className="border border-white/5 rounded-xl p-4 bg-[#242424]/50">
            <h3 className="text-sm font-bold mb-4 flex items-center justify-between">
                Состав сырья со склада
                <button onClick={addIngredient} className="text-orange-500 hover:text-orange-400 text-xs flex items-center gap-1">
                   <Plus className="w-3 h-3" /> Добавить
                </button>
            </h3>
            
            <div className="space-y-3">
              {ingredients.map((ing, i) => (
                <div key={ing.id} className="flex gap-2 items-center">
                  <select 
                    value={ing.inventoryItemId}
                    onChange={e => {
                        const newIngs = [...ingredients];
                        newIngs[i].inventoryItemId = e.target.value;
                        setIngredients(newIngs);
                    }}
                    className="flex-1 bg-black rounded-lg px-3 py-2 text-sm border border-white/10 outline-none focus:border-orange-500"
                  >
                    {inventoryItems.map(inv => (
                        <option key={inv.id} value={inv.id}>{inv.name} ({inv.unit})</option>
                    ))}
                  </select>
                  <input 
                    type="number"
                    step="0.01"
                    value={ing.quantity || ''}
                    placeholder="Кол-во"
                    onChange={e => {
                        const newIngs = [...ingredients];
                        newIngs[i].quantity = parseFloat(e.target.value) || 0;
                        setIngredients(newIngs);
                    }}
                    className="w-24 bg-black rounded-lg px-3 py-2 text-sm border border-white/10 outline-none focus:border-orange-500 text-center font-mono"
                  />
                  <button onClick={() => removeIngredient(ing.id)} className="text-white/30 hover:text-red-400 p-2">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {ingredients.length === 0 && (
                <div className="text-center py-4 text-xs text-white/30 uppercase tracking-widest">
                    Состав не указан
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1 block">Картинка (Файл или URL)</label>
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <input 
                  type="text" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..."
                  className="flex-1 bg-[#242424] rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 border border-white/5"
                />
                <label className="cursor-pointer flex items-center justify-center px-4 py-2 bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 rounded-lg text-sm font-bold border-0 transition-colors whitespace-nowrap">
                  Выбрать файл
                  <input 
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      if (e.target.files && e.target.files.length > 0) {
                        setImageFile(e.target.files[0]);
                        setImageUrl(URL.createObjectURL(e.target.files[0]));
                      }
                    }}
                  />
                </label>
              </div>
              {(imageUrl || imageFile) && (
                <div className="bg-white/5 p-2 rounded-xl flex items-center gap-3">
                  <img src={imageUrl} alt="preview" className="w-16 h-16 rounded-lg object-cover bg-white/10" />
                  <span className="text-sm text-neutral-400">Превью изображения</span>
                </div>
              )}
            </div>
          </div>

        </div>

        <div className="flex justify-between items-center p-6 border-t border-white/5 bg-[#1a1a1a] rounded-b-2xl shrink-0">
          {item ? (
            <button onClick={() => setConfirmDelete(true)} className="text-red-400 hover:bg-red-400/10 p-2 rounded-lg transition-colors">
              <Trash2 className="h-5 w-5" />
            </button>
          ) : <div />}
          <div className="flex gap-3">
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-bold transition-colors text-white/80">
              Отмена
            </button>
            <button onClick={handleSave} className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 font-bold text-sm transition-colors text-white uppercase tracking-wider">
              Сохранить
            </button>
          </div>
        </div>
      </div>
      
      {confirmDelete && (
        <ConfirmModal
          title="Удалить заготовку?"
          message={`Точно удалить "${item?.name}"?`}
          onConfirm={async () => {
             if (item?.id) await deleteMenuItem(item.id);
             setConfirmDelete(false);
             onClose();
          }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}
