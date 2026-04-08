"use client";

import { useState, useEffect } from "react";
import { X, Trash2, Image as ImageIcon, Plus } from "lucide-react";
import type { MenuItem } from '@rms/core';
import { useRecipesQuery, useSaveMenuItemMutation, useDeleteMenuItemMutation, useCategoriesQuery, useMenuQuery } from '@rms/core';
import { ConfirmModal } from "@/components/ConfirmModal";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  item: MenuItem | null;
}

export function MenuItemModal({ isOpen, onClose, item }: Props) {
  const saveMenuItemMut = useSaveMenuItemMutation();
  const deleteMenuItemMut = useDeleteMenuItemMutation();
  const { data: menuCategories = [] } = useCategoriesQuery();
  const { data: items = [] } = useMenuQuery();
  const { data: recipes = [] } = useRecipesQuery();

  useEffect(() => {
  }, [item?.id]);

  const existingDepartments = Array.from(new Set(items.map(i => i.kitchenDepartment).filter(Boolean)));

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [kitchenDepartment, setKitchenDepartment] = useState("");
  const [recipeId, setRecipeId] = useState("");
  const [isPoll, setIsPoll] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(item?.name || "");
      setPrice(item?.price?.toString() || "");
      setDescription(item?.description || "");
      setCategoryId(item?.categoryId || "");
      setKitchenDepartment(item?.kitchenDepartment || "");
      setRecipeId(item?.recipeId || "");
      setIsPoll(item?.isPoll || false);
      setImageUrl(item?.image || "");
      setImageFile(null);
    }
  }, [isOpen, item]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!name.trim()) return;

    await saveMenuItemMut.mutateAsync({
        id: item?.id,
        name: name.trim(),
        price: parseFloat(price.replace(',', '.')) || 0,
        description: description.trim(),
        categoryId: categoryId || undefined,
        kitchenDepartment: kitchenDepartment || undefined,
        recipeId: recipeId || undefined,
        isPoll,
        image: imageUrl.trim(),
        imageFile: imageFile || undefined,
    });

    onClose();
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
                  <label className="text-xs text-white/50 mb-1 block">Рецепт (Списание)</label>
                  <select
                    value={recipeId} onChange={e => setRecipeId(e.target.value)}
                    className="w-full bg-[#242424] rounded-lg px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-orange-500 border border-white/5"
                  >
                    <option value="">Без рецепта (продажа в 0)</option>
                    {recipes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
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
             if (item?.id) await deleteMenuItemMut.mutateAsync(item.id);
             setConfirmDelete(false);
             onClose();
          }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}
