"use client";

import { useEffect, useState } from "react";
import { Trash2, AlertTriangle, ScrollText, Plus, X, Search } from "lucide-react";
import { useWasteStore, WasteRecord } from "@/store/useWasteStore";
import { useInventoryStore, InventoryItem } from "@/store/useInventoryStore";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import Link from "next/link";

export default function WastePage() {
  const { records, isLoading, fetchWaste, addWaste } = useWasteStore();
  const { categories, fetchInventory } = useInventoryStore();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    fetchWaste();
    fetchInventory();
  }, [fetchWaste, fetchInventory]);

  const allInventoryItems = categories.flatMap(c => c.items);

  const handleSave = async () => {
    if (!selectedItemId || !quantity) return;
    try {
      await addWaste({
        inventory_item_id: selectedItemId,
        quantity: parseFloat(quantity),
        reason: reason.trim() || 'Списание по браку'
      });
      setIsModalOpen(false);
      setSelectedItemId("");
      setQuantity("");
      setReason("");
    } catch (e) {}
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Списания</h1>
          <p className="text-sm text-muted-foreground mt-1">Регистрация брака и порчи продуктов</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black transition-all shadow-lg shadow-red-500/20 active:scale-[0.98]"
        >
          <Plus className="w-5 h-5" />
          РЕГИСТРАЦИЯ БРАКА
        </button>
      </div>

      <div className="flex bg-[#141414] p-1.5 rounded-xl border border-white/5 shadow-inner mb-6 shrink-0 w-fit">
        <Link href="/inventory" className="px-5 py-2 font-bold text-sm transition-all rounded-lg flex items-center gap-2 text-white/40 hover:text-white/80">
          Категории
        </Link>
        <Link href="/inventory/waste" className="px-5 py-2 font-bold text-sm transition-all rounded-lg flex items-center gap-2 bg-red-600 text-white shadow-md shadow-red-600/20">
          Списания
        </Link>
        <Link href="/inventory/stocktakes" className="px-5 py-2 font-bold text-sm transition-all rounded-lg flex items-center gap-2 text-white/40 hover:text-white/80">
          Инвентаризация
        </Link>
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
          </div>
        ) : records.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-white/20">
            <Trash2 className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-xl font-bold">Списаний пока не было</p>
          </div>
        ) : (
          <div className="bg-[#111] rounded-3xl border border-white/5 overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 bg-white/2 text-[10px] text-white/30 uppercase font-black tracking-widest">
                  <th className="px-6 py-4">Дата</th>
                  <th className="px-6 py-4">Товар</th>
                  <th className="px-6 py-4">Количество</th>
                  <th className="px-6 py-4">Причина</th>
                  <th className="px-6 py-4 text-right">Потерь (₪)</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-white/5">
                {records.map(record => {
                  const item = record.expand?.inventory_item_id;
                  const loss = (item?.price || 0) * record.quantity;
                  return (
                    <tr key={record.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 font-medium text-white/40">
                         {format(new Date(record.created), "dd.MM HH:mm")}
                      </td>
                      <td className="px-6 py-4 font-bold">
                         {item?.name || "Удален"}
                      </td>
                      <td className="px-6 py-4">
                         <span className="text-red-500 font-black">-{record.quantity}</span> 
                      </td>
                      <td className="px-6 py-4 text-white/60 italic">
                         {record.reason}
                      </td>
                      <td className="px-6 py-4 text-right font-black text-white/80">
                         {loss.toFixed(2)} ₪
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && setIsModalOpen(false)}>
          <div className="bg-[#1a1a1a] rounded-2xl p-6 w-full max-w-md border border-white/10 shadow-2xl relative animate-in fade-in zoom-in duration-200">
             <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
               <X className="h-5 w-5" />
             </button>
             <h2 className="text-xl font-bold mb-6 text-red-500 flex items-center gap-2 italic uppercase tracking-tighter">
                <Trash2 className="w-6 h-6" /> Новое списание
             </h2>
             
             <div className="space-y-4">
               <div>
                  <label className="text-[10px] uppercase font-black text-white/30 mb-1 block">Выберите товар</label>
                  <select 
                    value={selectedItemId} 
                    onChange={e => setSelectedItemId(e.target.value)}
                    className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500/50"
                  >
                    <option value="">Не выбрано...</option>
                    {allInventoryItems.map(item => (
                      <option key={item.id} value={item.id}>{item.name} ({item.quantity} {item.unit} в наличии)</option>
                    ))}
                  </select>
               </div>
               
               <div>
                  <label className="text-[10px] uppercase font-black text-white/30 mb-1 block">Количество к списанию</label>
                  <input 
                    type="number" step="0.01" value={quantity} onChange={e => setQuantity(e.target.value)}
                    className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500/50"
                  />
               </div>

               <div>
                  <label className="text-[10px] uppercase font-black text-white/30 mb-1 block">Причина / Примечание</label>
                  <textarea 
                    rows={2} value={reason} onChange={e => setReason(e.target.value)}
                    className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500/50 resize-none"
                    placeholder="Напр: Истек срок годности / Брак упаковки"
                  />
               </div>

               <button 
                 onClick={handleSave}
                 className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-red-500/10 active:scale-[0.99] transition-all"
               >
                 СПИСАТЬ СО СКЛАДА
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
