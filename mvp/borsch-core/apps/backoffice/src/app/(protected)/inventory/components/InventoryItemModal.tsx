import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { InventoryItem, useInventoryStore } from "@rms/core";

interface InventoryItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item?: InventoryItem | null;
}

export function InventoryItemModal({ isOpen, onClose, item }: InventoryItemModalProps) {
  const { saveInventoryItem, categories } = useInventoryStore();

  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState(0);
  const [categoryId, setCategoryId] = useState("");
  const [unit, setUnit] = useState("кг");
  const [unitsPerPackage, setUnitsPerPackage] = useState(1);


  useEffect(() => {
    if (item && item.id) {
      setName(item.name || "");
      setQuantity(item.quantity || 0);
      setCategoryId(item.categoryId || "");
      setUnit(item.unit || "кг");
      setUnitsPerPackage(item.unitsPerPackage || 1);
    } else {
      setName("");
      setQuantity(0);
      // For new item passed with categoryId pre-selected from drag&drop column
      if (item && item.categoryId) {
        setCategoryId(item.categoryId);
      } else {
        setCategoryId(categories.length > 0 ? categories[0].id : "");
      }
      setUnit("кг");
      setUnitsPerPackage(1);
    }
  }, [item, isOpen, categories]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !categoryId) return;
    
    await saveInventoryItem({ 
      id: item?.id, 
      name, 
      quantity, 
      categoryId,
      unit,
      unitsPerPackage: unit === 'упаковка' ? unitsPerPackage : 1
    } as any);
    
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-md flex flex-col shadow-2xl">
        <div className="flex justify-between items-center p-5 border-b border-white/5">
          <h2 className="text-xl font-bold">{item ? "Редактировать товар" : "Новый товар"}</h2>
          <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-white/50 uppercase">Название</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-colors"
              placeholder="Например: Картошка"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-white/50 uppercase">Единицы изм.</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                required
                className="bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="кг">Килограммы (кг)</option>
                <option value="гр">Граммы (гр)</option>
                <option value="литр">Литры (л)</option>
                <option value="шт">Штуки (шт)</option>
                <option value="упаковка">Упаковки</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-white/50 uppercase">Кол-во на складе</label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {unit === "упаковка" && (
            <div className="flex flex-col gap-2 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl animate-in fade-in slide-in-from-top-2">
              <label className="text-sm font-bold text-blue-400 uppercase">Сколько штук внутри одной упаковки?</label>
              <input
                type="number"
                min="1"
                step="1"
                required
                value={unitsPerPackage}
                onChange={(e) => setUnitsPerPackage(Number(e.target.value))}
                className="bg-black/50 border border-blue-500/20 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-colors"
                placeholder="100"
              />
            </div>
          )}


          <div className="pt-2 flex gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-blue-500/20"
            >
              {item ? "Сохранить" : "Добавить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
