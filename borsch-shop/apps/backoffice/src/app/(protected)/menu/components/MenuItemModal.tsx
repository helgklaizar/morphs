"use client";

import { useState, useEffect } from "react";
import { X, Trash2, Image as ImageIcon } from "lucide-react";
import { MenuItem, useMenuStore } from "@/store/useMenuStore";
import { useRecipesStore } from "@/store/useRecipesStore";
import { useAssembliesStore } from "@/store/useAssembliesStore";
import { ConfirmModal } from "@/components/ConfirmModal";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  item: MenuItem | null;
}

export function MenuItemModal({ isOpen, onClose, item }: Props) {
  const { saveMenuItem, deleteMenuItem, categories } = useMenuStore();
  const { recipes } = useRecipesStore();
  const { assemblies } = useAssembliesStore();

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [recipeId, setRecipeId] = useState("");
  const [assemblyId, setAssemblyId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [isPoll, setIsPoll] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(item?.name || "");
      setPrice(item?.price?.toString() || "");
      setDescription(item?.description || "");
      setRecipeId(item?.recipeId || "");
      setAssemblyId(item?.assemblyId || "");
      setCategoryId(item?.categoryId || "");
      setIsPoll(item?.isPoll || false);
      setImageUrl(item?.image || "");
    }
  }, [isOpen, item]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!name.trim()) return;
    await saveMenuItem({
      id: item?.id,
      name: name.trim(),
      price: parseFloat(price.replace(',', '.')) || 0,
      description: description.trim(),
      recipeId: recipeId || undefined,
      assemblyId: assemblyId || undefined,
      categoryId: categoryId || undefined,
      isPoll,
      image: imageUrl.trim(),
    });
    onClose();
  };

  const handleDelete = async () => {
    if (!item?.id) return;
    setConfirmDelete(true);
  };

  const confirmAndExecuteDelete = async () => {
    if (!item?.id) return;
    await deleteMenuItem(item.id);
    setConfirmDelete(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#1a1a1a] rounded-2xl p-6 w-full max-w-lg border border-white/10 shadow-2xl relative animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
          <X className="h-5 w-5" />
        </button>
        
        <h2 className="text-xl font-bold mb-6">{item ? 'Редактировать блюдо' : 'Новое блюдо'}</h2>
        
        <div className="space-y-4 overflow-y-auto pr-2 flex-1">
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
                className="w-full bg-[#242424] rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 border border-white/5"
              />
            </div>
            <div className="flex flex-col justify-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" checked={isPoll} onChange={e => setIsPoll(e.target.checked)}
                  className="w-4 h-4 accent-purple-500 rounded border-white/10 bg-[#242424]"
                />
                <span className="text-sm font-semibold text-purple-400">Это ОПРОС</span>
              </label>
            </div>
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1 block">URL Картинки</label>
            <div className="flex gap-2">
              <input 
                type="text" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..."
                className="flex-1 bg-[#242424] rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 border border-white/5"
              />
              {imageUrl && <img src={imageUrl} alt="preview" className="w-11 h-11 rounded-lg object-cover bg-white/5" />}
            </div>
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1 block">Описание</label>
            <textarea 
              rows={3} value={description} onChange={e => setDescription(e.target.value)}
              className="w-full bg-[#242424] rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 border border-white/5 resize-none"
            />
          </div>

          <div className="pt-2 border-t border-white/5 space-y-4">
            <div>
              <label className="text-xs text-white/50 mb-1 block">Категория меню</label>
              <select
                value={categoryId} onChange={e => setCategoryId(e.target.value)}
                className="w-full bg-[#242424] rounded-lg px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-orange-500 border border-white/5"
              >
                <option value="">Без категории</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Привязанный Рецепт (Основа)</label>
              <select
                value={recipeId} onChange={e => setRecipeId(e.target.value)}
                className="w-full bg-[#242424] rounded-lg px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-orange-500 border border-white/5"
              >
                <option value="">Без рецепта (нет расчета себест.)</option>
                {recipes.map(r => <option key={r.id} value={r.id}>{r.name} ({r.portions} порц.)</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Привязанная Сборка (Расходники)</label>
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

        <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/10 shrink-0">
          {item ? (
            <button onClick={handleDelete} className="text-red-400 hover:bg-red-400/10 p-2 rounded-lg transition-colors">
              <Trash2 className="h-5 w-5" />
            </button>
          ) : <div />}
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-medium transition-colors text-white/80">
              Отмена
            </button>
            <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 font-bold text-sm transition-colors text-white">
              Сохранить
            </button>
          </div>
        </div>
      </div>
      
      {confirmDelete && (
        <ConfirmModal
          title="Удалить блюдо?"
          message={`Точно удалить блюдо "${item?.name}"?`}
          onConfirm={confirmAndExecuteDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}
