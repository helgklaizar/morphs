"use client";

import { useState, useEffect } from "react";
import { X, Trash2 } from "lucide-react";
import { InventoryItem, useInventoryStore } from "@/store/useInventoryStore";
import { ConfirmModal } from "@/components/ConfirmModal";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  categoryId: string; // fallback if adding
}

const UNITS = ['шт', 'кг', 'г', 'л', 'мл', 'уп', 'пл'];

export function InventoryItemModal({ isOpen, onClose, item, categoryId }: Props) {
  const { categories, saveItem, deleteItem } = useInventoryStore();

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [supplier, setSupplier] = useState("");
  const [packSize, setPackSize] = useState("");
  const [unit, setUnit] = useState("шт");
  const [recipeUnit, setRecipeUnit] = useState("г");
  const [yieldPerUnit, setYieldPerUnit] = useState("1");
  const [isConverting, setIsConverting] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(item?.name || "");
      setPrice(item?.price?.toString() || "");
      setSupplier(item?.supplier || "");
      setPackSize(item?.packSize?.toString() || "1.0");
      setUnit(item?.unit || "шт");
      setSelectedCatId(item?.categoryId || categoryId);
      
      if (item?.recipeUnit && item.recipeUnit !== item.unit) {
        setIsConverting(true);
        setRecipeUnit(item.recipeUnit);
        setYieldPerUnit(item.yieldPerUnit?.toString() || "1");
      } else {
        setIsConverting(false);
        setRecipeUnit("г");
        setYieldPerUnit("1");
      }
    }
  }, [isOpen, item, categoryId]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!name.trim()) return;
    await saveItem({
      id: item?.id,
      name: name.trim(),
      price: parseFloat(price.replace(',', '.')) || 0,
      supplier: supplier.trim(),
      packSize: parseFloat(packSize.replace(',', '.')) || 1.0,
      unit,
      categoryId: selectedCatId,
      quantity: item?.quantity || 0,
      recipeUnit: isConverting ? recipeUnit : null,
      yieldPerUnit: isConverting ? (parseFloat(yieldPerUnit.replace(',', '.')) || 1) : null,
    });
    onClose();
  };

  const handleDelete = async () => {
    if (!item?.id) return;
    setConfirmDelete(true);
  };

  const confirmAndExecuteDelete = async () => {
    if (!item?.id) return;
    await deleteItem(item.id);
    setConfirmDelete(false);
    onClose();
  };

  const isPack = unit === 'уп' || unit === 'пл';
  const unitPrice = isPack ? ((parseFloat(price) || 0) / (parseFloat(packSize) || 1)).toFixed(2) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#1a1a1a] rounded-2xl p-6 w-full max-w-md border border-white/10 shadow-2xl relative animate-in fade-in zoom-in duration-200">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
          <X className="h-5 w-5" />
        </button>
        
        <h2 className="text-xl font-bold mb-6">{item ? 'Редактировать товар' : 'Новый товар'}</h2>
        
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          <div>
            <label className="text-xs text-white/50 mb-1 block">Категория</label>
            <select
              value={selectedCatId}
              onChange={(e) => setSelectedCatId(e.target.value)}
              className="w-full bg-[#242424] rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 border border-white/5"
            >
              {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1 block">Название *</label>
            <input 
              type="text" value={name} onChange={e => setName(e.target.value)}
              className="w-full bg-[#242424] rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 border border-white/5"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-white/50 mb-1 block">Цена (₪/{unit})</label>
              <input 
                type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)}
                className="w-full bg-[#242424] rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 border border-white/5"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Ед. измерения</label>
              <select
                value={unit} onChange={e => setUnit(e.target.value)}
                className="w-full bg-[#242424] rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 border border-white/5"
              >
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1 block">Кол-во в упаковке (если ед. упаковка)</label>
            <input 
              type="number" step="0.01" value={packSize} onChange={e => setPackSize(e.target.value)}
              className="w-full bg-[#242424] rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 border border-white/5"
            />
          </div>
          
          {isPack && (
            <p className="text-xs text-green-400 font-bold">Цена за 1 шт: {unitPrice} ₪</p>
          )}

          <div>
            <label className="text-xs text-white/50 mb-1 block">Поставщик</label>
            <input 
              type="text" value={supplier} onChange={e => setSupplier(e.target.value)}
              className="w-full bg-[#242424] rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 border border-white/5"
            />
          </div>

          <div className="pt-2 border-t border-white/5">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-white/80">
              <input 
                type="checkbox" 
                checked={isConverting} 
                onChange={(e) => setIsConverting(e.target.checked)}
                className="accent-orange-500 rounded bg-white/10 border-transparent focus:ring-0" 
              />
              Нужна конвертация для рецептов
            </label>
            
            {isConverting && (
              <div className="mt-4 p-4 bg-orange-500/5 border border-orange-500/10 rounded-xl space-y-4">
                <div>
                  <label className="text-xs text-orange-500/70 mb-1 block">В чем измеряется в рецепте?</label>
                  <select
                    value={recipeUnit} onChange={e => setRecipeUnit(e.target.value)}
                    className="w-full bg-[#242424] rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 border border-white/5"
                  >
                    <option value="г">г (Граммы)</option>
                    <option value="кг">кг (Килограммы)</option>
                    <option value="мл">мл (Миллилитры)</option>
                    <option value="л">л (Литры)</option>
                    <option value="шт">шт (Штуки)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-orange-500/70 mb-1 block">Сколько &laquo;{recipeUnit}&raquo; в 1 {unit}?</label>
                  <div className="relative">
                    <input 
                      type="number" step="0.01" value={yieldPerUnit} onChange={e => setYieldPerUnit(e.target.value)}
                      className="w-full bg-[#242424] rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 border border-white/5"
                    />
                    <div className="absolute right-4 top-3 text-xs text-white/30">{recipeUnit}</div>
                  </div>
                  <p className="text-[10px] text-white/40 mt-1.5 leading-tight">
                    Например: если 1 упаковка сливочного масла весит 250г, впишите здесь 250. 
                    Система сама посчитает стоимость 1 {recipeUnit} для рецепта.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center mt-6 pt-4 border-t border-white/10">
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
          title="Удалить товар?"
          message={`Точно удалить товар "${item?.name}"?`}
          onConfirm={confirmAndExecuteDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}
