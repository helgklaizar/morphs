"use client";

import { useState, useEffect } from "react";
import { X, Trash2, Image as ImageIcon, Plus } from "lucide-react";
import { MenuItem, useMenuStore } from "@/store/useMenuStore";
import { useRecipesStore } from "@/store/useRecipesStore";
import { useAssembliesStore } from "@/store/useAssembliesStore";
import { useInventoryStore } from "@/store/useInventoryStore";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useLandingSettingsStore } from "@/store/useLandingSettingsStore";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  item: MenuItem | null;
}

export function MenuItemModal({ isOpen, onClose, item }: Props) {
  const { saveMenuItem, saveWithRecipe, deleteMenuItem, categories: menuCategories, items } = useMenuStore();
  const { recipes, fetchRecipes } = useRecipesStore();
  const { assemblies } = useAssembliesStore();
  const { categories: inventoryCategories, fetchInventory } = useInventoryStore();

  const inventoryItems = inventoryCategories.flatMap(c => c.items);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [recipeId, setRecipeId] = useState("");
  const [assemblyId, setAssemblyId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [kitchenDepartment, setKitchenDepartment] = useState("");
  const [isPoll, setIsPoll] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Hybrid composition
  const [composition, setComposition] = useState<{
    id: string;
    type: 'prep' | 'inv';
    itemId: string;
    quantity: number;
  }[]>([]);

  const preparations = items.filter(i => i.isPrep && i.recipeId); // only preps with recipe

  useEffect(() => {
    if (isOpen) {
      fetchInventory();
      fetchRecipes();

      setName(item?.name || "");
      setPrice(item?.price?.toString() || "");
      setDescription(item?.description || "");
      setRecipeId(item?.recipeId || "");
      setAssemblyId(item?.assemblyId || "");
      setCategoryId(item?.categoryId || "");
      setKitchenDepartment(item?.kitchenDepartment || "");
      setIsPoll(item?.isPoll || false);
      setImageUrl(item?.image || "");
      setImageFile(null);
      
      if (!item?.recipeId) {
         setComposition([]);
      }
    }
  }, [isOpen, item]);

  // Handle recipe fetching locally for composition
  useEffect(() => {
    async function loadComposition() {
      if (item?.recipeId && isOpen) {
        const { pb } = await import("@/lib/pocketbase");
        const recIngs = await pb.collection('recipe_ingredients').getFullList({ filter: `recipe_id = "${item.recipeId}"` });
        
        // If the recipe is an embedded one (name starts with ТТК: itemname), we can populate the composition picker
        const parentRecipe = recipes.find(r => r.id === item.recipeId);
        if (parentRecipe?.name === `ТТК: ${item.name}` && recIngs.length > 0) {
           setComposition(recIngs.map(r => {
             if (r.nested_recipe_id) {
                return { id: crypto.randomUUID(), type: 'prep', itemId: r.nested_recipe_id, quantity: r.quantity };
             } else {
                return { id: crypto.randomUUID(), type: 'inv', itemId: r.inventory_item_id, quantity: r.quantity };
             }
           }));
        } else {
           setComposition([]);
        }
      }
    }
    loadComposition();
  }, [isOpen, item?.recipeId, recipes]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!name.trim()) return;

    if (composition.length > 0) {
       // Save using the hybrid generic composition engine
       const formattedIngredients = composition.map(i => {
          if (i.type === 'prep') return { nestedRecipeId: i.itemId, quantity: i.quantity };
          return { inventoryItemId: i.itemId, quantity: i.quantity };
       });

       await saveWithRecipe({
          id: item?.id,
          name: name.trim(),
          price: parseFloat(price.replace(',', '.')) || 0,
          description: description.trim(),
          assemblyId: assemblyId || undefined,
          categoryId: categoryId || undefined,
          kitchenDepartment: kitchenDepartment || undefined,
          isPoll,
          recipeId: recipeId || undefined,
          image: imageUrl.trim(),
          imageFile: imageFile || undefined,
       }, formattedIngredients);
    } else {
       // Standard save
       await saveMenuItem({
          id: item?.id,
          name: name.trim(),
          price: parseFloat(price.replace(',', '.')) || 0,
          description: description.trim(),
          recipeId: recipeId || undefined,
          assemblyId: assemblyId || undefined,
          categoryId: categoryId || undefined,
          kitchenDepartment: kitchenDepartment || undefined,
          isPoll,
          image: imageUrl.trim(),
          imageFile: imageFile || undefined,
       });
    }

    onClose();
  };

  const addComponent = (type: 'prep' | 'inv') => {
    if (type === 'prep') {
        if (preparations.length === 0) return;
        setComposition([...composition, { id: crypto.randomUUID(), type: 'prep', itemId: preparations[0].recipeId!, quantity: 1 }]);
    } else {
        if (inventoryItems.length === 0) return;
        setComposition([...composition, { id: crypto.randomUUID(), type: 'inv', itemId: inventoryItems[0].id, quantity: 1 }]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-xl border border-white/10 shadow-2xl relative animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        
        <div className="flex justify-between items-center shrink-0 p-6 border-b border-white/5">
            <h2 className="text-xl font-bold">{item ? 'Редактировать блюдо' : 'Новое блюдо'}</h2>
            <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          <div>
            <label className="text-xs text-white/50 mb-1 block">Название блюда *</label>
            <input 
              type="text" value={name} onChange={e => setName(e.target.value)}
              className="w-full bg-[#242424] rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 border border-white/5"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-white/50 mb-1 block">Цена продажи (₪)</label>
              <input 
                type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)}
                className="w-full bg-[#242424] rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 border border-white/5 font-bold"
              />
            </div>
            <div className="flex flex-col justify-center">
              <label className="flex items-center gap-2 cursor-pointer mb-2 pt-2">
                <input 
                  type="checkbox" checked={isPoll} onChange={e => setIsPoll(e.target.checked)}
                  className="w-4 h-4 accent-purple-500 rounded border-white/10 bg-[#242424]"
                />
                <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Это ОПРОС</span>
              </label>
            </div>
          </div>

          <div className="border border-white/5 rounded-xl p-4 bg-[#242424]/50">
            <h3 className="text-sm font-bold mb-4 flex items-center justify-between">
                Состав (Заготовки и Сырье)
                <div className="flex gap-2">
                    <button onClick={() => addComponent('prep')} className="text-orange-500 hover:text-orange-400 text-xs flex items-center gap-1 font-bold">
                       <Plus className="w-3 h-3" /> Заготовка
                    </button>
                    <button onClick={() => addComponent('inv')} className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1 font-bold ml-2">
                       <Plus className="w-3 h-3" /> Товар/Продукт
                    </button>
                </div>
            </h3>
            
            <div className="space-y-3">
              {composition.map((comp, i) => (
                <div key={comp.id} className="flex gap-2 items-center">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded shrink-0 w-24 text-center ${comp.type === 'prep' ? 'bg-orange-500/10 text-orange-500' : 'bg-blue-400/10 text-blue-400'}`}>
                    {comp.type === 'prep' ? 'Заготовка' : 'Сырье'}
                  </span>
                  <select 
                    value={comp.itemId}
                    onChange={e => {
                        const newComp = [...composition];
                        newComp[i].itemId = e.target.value;
                        setComposition(newComp);
                    }}
                    className="flex-1 bg-black rounded-lg px-3 py-2 text-sm border border-white/10 outline-none focus:border-orange-500"
                  >
                    {comp.type === 'prep' 
                       ? preparations.map(p => <option key={p.id} value={p.recipeId!}>{p.name} ({p.unit})</option>)
                       : inventoryItems.map(inv => <option key={inv.id} value={inv.id}>{inv.name} ({inv.unit})</option>)
                    }
                  </select>
                  <input 
                    type="number"
                    step="0.01"
                    value={comp.quantity || ''}
                    placeholder="Кол-во"
                    onChange={e => {
                        const newComp = [...composition];
                        newComp[i].quantity = parseFloat(e.target.value) || 0;
                        setComposition(newComp);
                    }}
                    className="w-24 bg-black rounded-lg px-3 py-2 text-sm border border-white/10 outline-none focus:border-orange-500 text-center font-mono"
                  />
                  <button onClick={() => setComposition(composition.filter(c => c.id !== comp.id))} className="text-white/30 hover:text-red-400 p-2">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {composition.length === 0 && (
                <div className="text-center py-4 text-xs text-white/30 uppercase tracking-widest border border-dashed border-white/10 rounded-lg">
                    Состав не настроен (или из Общего Рецепта)
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

          <div className="pt-2 border-t border-white/5 space-y-4">
            <div>
              <label className="text-xs text-white/50 mb-1 block">Общий Рецепт (Из базы) - Только если нет своего состава</label>
              <select
                value={recipeId} onChange={e => setRecipeId(e.target.value)}
                disabled={composition.length > 0}
                className="w-full bg-[#242424] rounded-lg px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-orange-500 border border-white/5 disabled:opacity-50"
              >
                <option value="">Без рецепта (или кастомный состав)</option>
                {recipes.map(r => <option key={r.id} value={r.id}>{r.name} ({r.portions} порц.)</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Категория меню</label>
                  <select
                    value={categoryId} onChange={e => setCategoryId(e.target.value)}
                    className="w-full bg-[#242424] rounded-lg px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-orange-500 border border-white/5"
                  >
                    <option value="">Без категории</option>
                    {menuCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Отдел кухни</label>
                  <input
                    type="text" value={kitchenDepartment} onChange={e => setKitchenDepartment(e.target.value)}
                    placeholder="Горячий цех"
                    className="w-full bg-[#242424] rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 border border-white/5"
                  />
                </div>
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Сборка (Упаковка)</label>
              <select
                value={assemblyId} onChange={e => setAssemblyId(e.target.value)}
                className="w-full bg-[#242424] rounded-lg px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-orange-500 border border-white/5"
              >
                <option value="">Без сборки</option>
                {assemblies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>

        </div>

        <div className="flex justify-between items-center p-6 border-t border-white/5 shrink-0 bg-[#1a1a1a] rounded-b-2xl">
          {item ? (
            <button onClick={() => setConfirmDelete(true)} className="text-red-400 hover:bg-red-400/10 p-2 rounded-lg transition-colors">
              <Trash2 className="h-5 w-5" />
            </button>
          ) : <div />}
          <div className="flex gap-3">
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-bold transition-colors text-white/80">
              Отмена
            </button>
            <button onClick={handleSave} className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 font-bold text-sm transition-colors text-white shadow-lg shadow-orange-500/20 uppercase tracking-wider">
              Сохранить
            </button>
          </div>
        </div>
      </div>
      
      {confirmDelete && (
        <ConfirmModal
          title="Удалить блюдо?"
          message={`Точно удалить блюдо "${item?.name}"?`}
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
