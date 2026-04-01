"use client";

import { useState, useEffect } from "react";
import { X, Trash2, Plus } from "lucide-react";
import { Assembly, useAssembliesStore } from "@/store/useAssembliesStore";
import { useInventoryStore, InventoryItem } from "@/store/useInventoryStore";
import { ConfirmModal } from "@/components/ConfirmModal";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  assembly: Assembly | null;
}

export function AssemblyEditModal({ isOpen, onClose, assembly }: Props) {
  const { addAssembly, updateAssembly, deleteAssembly } = useAssembliesStore();
  const { categories } = useInventoryStore();

  const [name, setName] = useState("");
  const [items, setItems] = useState<{ inventoryItemId: string, quantity: number }[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const allInventoryItems = categories.flatMap(c => c.items);
  const availableInventoryItems = categories.filter(c => c.isVisibleInAssemblies).flatMap(c => c.items);

  useEffect(() => {
    if (isOpen) {
      setName(assembly?.name || "");
      setItems(assembly?.items.map(i => ({ inventoryItemId: i.inventoryItemId, quantity: i.quantity })) || []);
    }
  }, [isOpen, assembly]);

  if (!isOpen) return null;

  const totalCost = items.reduce((sum, ing) => {
    const invItem = allInventoryItems.find(i => i.id === ing.inventoryItemId);
    return sum + (ing.quantity * (invItem?.price || 0));
  }, 0);

  const handleSave = async () => {
    if (!name.trim()) return;
    try {
      if (assembly) {
        await updateAssembly(assembly.id, name.trim(), items);
      } else {
        await addAssembly(name.trim(), items);
      }
      onClose();
    } catch (e) {
      console.error("Failed to save assembly: ", e);
    }
  };

  const handleDelete = async () => {
    if (!assembly) return;
    setConfirmDelete(true);
  };

  const confirmAndExecuteDelete = async () => {
    if (!assembly) return;
    await deleteAssembly(assembly.id);
    setConfirmDelete(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#1a1a1a] rounded-2xl p-6 w-full max-w-lg border border-white/10 shadow-2xl relative animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
          <X className="h-5 w-5" />
        </button>
        
        <h2 className="text-xl font-bold mb-4">{assembly ? 'Редактировать сборку' : 'Новая сборка'}</h2>
        
        <div className="space-y-4 overflow-y-auto flex-1 pr-2">
          <div>
            <label className="text-xs text-white/50 mb-1 block">Название сборки *</label>
            <input 
              type="text" value={name} onChange={e => setName(e.target.value)} placeholder='Например: "Упаковка для ланча"'
              className="w-full bg-[#242424] rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 border border-white/5"
            />
          </div>

          <div>
            <label className="text-xs text-white/50 mb-2 block">Состав</label>
            <div className="space-y-2 mb-3">
              {items.map((ing, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <select 
                    value={ing.inventoryItemId} 
                    onChange={e => {
                      const newIngs = [...items];
                      newIngs[idx].inventoryItemId = e.target.value;
                      setItems(newIngs);
                    }}
                    className="flex-1 bg-[#242424] rounded-lg px-3 py-2 text-[13px] border border-white/5 outline-none max-w-[200px]"
                  >
                    <option value="" disabled>Выберите материал...</option>
                    {availableInventoryItems.map(item => <option key={item.id} value={item.id}>{item.name} ({item.price} ₪/{item.unit})</option>)}
                    {(() => {
                      const currentlySelected = allInventoryItems.find(i => i.id === ing.inventoryItemId);
                      if (currentlySelected && !availableInventoryItems.some(i => i.id === currentlySelected.id)) {
                        return <option key={currentlySelected.id} value={currentlySelected.id}>{currentlySelected.name} ({currentlySelected.price} ₪/{currentlySelected.unit})</option>;
                      }
                      return null;
                    })()}
                  </select>
                  <input 
                    type="number" step="0.001" value={ing.quantity} 
                    onChange={e => {
                      const newIngs = [...items];
                      newIngs[idx].quantity = parseFloat(e.target.value) || 0;
                      setItems(newIngs);
                    }}
                    className="w-20 bg-[#242424] rounded-lg px-3 py-2 text-[13px] border border-white/5 outline-none text-center" 
                  />
                  <div className="w-8 text-[11px] text-white/40">
                    {allInventoryItems.find(i => i.id === ing.inventoryItemId)?.unit || 'шт'}
                  </div>
                  <button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-white/40 hover:bg-white/10 hover:text-red-400 p-2 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button 
              onClick={() => setItems([...items, { inventoryItemId: "", quantity: 1 }])} 
              className="w-full bg-white/5 hover:bg-white/10 rounded-lg py-2 text-sm text-white/80 transition-colors flex justify-center items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Добавить материал со склада
            </button>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-white/5">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-white/60">Общая себестоимость:</span>
            <div className="text-lg font-bold text-blue-500">{totalCost.toFixed(2)} ₪</div>
          </div>
          <div className="flex gap-3">
            {assembly && (
              <button onClick={handleDelete} className="text-red-400 hover:bg-red-400/10 p-2 rounded-lg transition-colors">
                <Trash2 className="h-5 w-5" />
              </button>
            )}
            <button onClick={onClose} className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-lg text-sm transition-colors">Отмена</button>
            <button onClick={handleSave} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-lg text-sm transition-colors">Сохранить</button>
          </div>
        </div>
      </div>
      
      {confirmDelete && (
        <ConfirmModal
          title="Удалить сборку?"
          message={`Точно удалить сборку "${assembly?.name}"?`}
          onConfirm={confirmAndExecuteDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}
