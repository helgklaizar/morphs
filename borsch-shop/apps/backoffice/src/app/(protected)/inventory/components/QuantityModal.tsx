"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { InventoryItem, useInventoryStore } from "@/store/useInventoryStore";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
}

export function QuantityModal({ isOpen, onClose, item }: Props) {
  const { updateItemQuantity } = useInventoryStore();
  const [qty, setQty] = useState("");

  useEffect(() => {
    if (isOpen && item) {
      setQty(item.quantity.toString());
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const parsed = parseFloat(qty.replace(',', '.'));
    if (!isNaN(parsed)) {
      await updateItemQuantity(item.id, parsed);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#1a1a1a] rounded-2xl p-6 w-full max-w-sm border border-white/10 shadow-2xl relative animate-in fade-in zoom-in duration-200">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
          <X className="h-5 w-5" />
        </button>
        
        <h2 className="text-xl font-bold mb-4">Количество: {item.name}</h2>
        
        <form onSubmit={handleSave} className="space-y-4">
          <div className="relative">
            <input 
              type="number" step="0.001" autoFocus
              value={qty} onChange={e => setQty(e.target.value)}
              className="w-full bg-[#242424] rounded-lg pl-4 pr-12 py-3 text-lg font-bold focus:outline-none focus:ring-1 focus:ring-orange-500 border border-white/5 text-center"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 font-bold">
              {item.unit}
            </div>
          </div>
          
          <button type="submit" className="w-full px-4 py-3 rounded-lg bg-orange-500 hover:bg-orange-600 font-bold text-sm transition-colors text-white">
            Сохранить
          </button>
        </form>
      </div>
    </div>
  );
}
