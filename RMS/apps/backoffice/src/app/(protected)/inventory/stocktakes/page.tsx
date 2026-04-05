"use client";

import { useEffect, useState } from "react";
import { Plus, History, CheckCircle2, AlertTriangle, ArrowRight, Save, X } from "lucide-react";
import { useStocktakesStore, Stocktake } from "@/store/useStocktakesStore";
import { useInventoryStore, InventoryItem } from "@/store/useInventoryStore";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import Link from "next/link";

export default function StocktakesPage() {
  const { records, isLoading, fetchStocktakes, createStocktake } = useStocktakesStore();
  const { categories, fetchInventory } = useInventoryStore();
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditData, setAuditData] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchStocktakes();
    fetchInventory();
  }, [fetchStocktakes, fetchInventory]);

  const allItems = categories.flatMap(c => c.items);

  const startAudit = () => {
    const initialData: Record<string, number> = {};
    allItems.forEach(item => {
      initialData[item.id] = item.quantity;
    });
    setAuditData(initialData);
    setIsAuditing(true);
  };

  const handleAuditSave = async () => {
    const itemsToSave = allItems.map(item => ({
      inventory_item_id: item.id,
      expected_quantity: item.quantity,
      actual_quantity: auditData[item.id] ?? 0,
      difference: (auditData[item.id] ?? 0) - item.quantity,
    }));

    await createStocktake(itemsToSave);
    setIsAuditing(false);
    fetchInventory(); // Refresh inventory counts
  };

  if (isAuditing) {
    return (
      <div className="flex h-full flex-col animate-in fade-in slide-in-from-bottom-4">
        <header className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
          <div>
            <h1 className="text-2xl font-black italic uppercase text-orange-500">Инвентаризация</h1>
            <p className="text-sm text-white/40">Сверка фактических остатков на складе</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setIsAuditing(false)}
              className="px-6 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold transition-colors"
            >
              Отмена
            </button>
            <button 
              onClick={handleAuditSave}
              className="flex items-center gap-2 px-8 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-black font-black transition-colors"
            >
              <Save className="w-4 h-4" />
              ЗАВЕРШИТЬ СВЕРКУ
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto pr-2 space-y-8 pb-20">
          {categories.map(cat => (
            <div key={cat.id} className="space-y-3">
              <h3 className="text-lg font-bold text-white/50 px-2 uppercase tracking-widest border-l-4 border-orange-500 pl-4">{cat.name}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {cat.items.map(item => {
                  const diff = (auditData[item.id] ?? 0) - item.quantity;
                  return (
                    <div key={item.id} className={`bg-[#111] p-5 rounded-2xl border ${diff !== 0 ? 'border-orange-500/20' : 'border-white/5'}`}>
                      <div className="flex justify-between items-start mb-4">
                        <span className="font-bold text-sm truncate pr-2 uppercase">{item.name}</span>
                        <span className="text-[10px] text-white/40 font-black uppercase tracking-wider">{item.unit}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] text-white/30 uppercase font-black block mb-1">Ожидаемо</label>
                          <div className="text-xl font-medium text-white/80">{item.quantity}</div>
                        </div>
                        <div>
                          <label className="text-[10px] text-orange-500 uppercase font-black block mb-1">Факт</label>
                          <input 
                            type="number" 
                            step="0.01" 
                            value={auditData[item.id] ?? 0}
                            onChange={(e) => setAuditData({...auditData, [item.id]: parseFloat(e.target.value) || 0})}
                            className="w-full bg-white/5 border border-white/5 rounded-lg px-2 py-1 text-xl font-bold text-orange-500 focus:outline-none focus:border-orange-500 transition-colors"
                          />
                        </div>
                      </div>
                      {diff !== 0 && (
                        <div className={`mt-3 py-1 px-3 rounded-lg text-[11px] font-black uppercase flex items-center justify-between ${diff > 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                          <span>Разница</span>
                          <span>{diff > 0 ? '+' : ''}{diff.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Инвентаризация</h1>
          <p className="text-sm text-muted-foreground mt-1">История сверок и аудит склада</p>
        </div>
        <button 
          onClick={startAudit}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black transition-all shadow-lg shadow-orange-500/20 active:scale-[0.98]"
        >
          <Plus className="w-5 h-5" />
          НОВАЯ СВЕРКА
        </button>
      </div>

      <div className="flex bg-[#141414] p-1.5 rounded-xl border border-white/5 shadow-inner mb-6 shrink-0 w-fit">
        <Link href="/inventory" className="px-5 py-2 font-bold text-sm transition-all rounded-lg flex items-center gap-2 text-white/40 hover:text-white/80">
          Категории
        </Link>
        <Link href="/inventory/waste" className="px-5 py-2 font-bold text-sm transition-all rounded-lg flex items-center gap-2 text-white/40 hover:text-white/80">
          Списания
        </Link>
        <Link href="/inventory/stocktakes" className="px-5 py-2 font-bold text-sm transition-all rounded-lg flex items-center gap-2 bg-orange-500 text-white shadow-md shadow-orange-500/20">
          Инвентаризация
        </Link>
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
          </div>
        ) : records.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-white/20">
            <History className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-xl font-bold">Истории сверок пока нет</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {records.map(record => (
              <div key={record.id} className="bg-[#111] rounded-3xl border border-white/5 overflow-hidden border-white/5 hover:border-white/10 transition-colors group">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div className="bg-orange-500/10 p-3 rounded-2xl">
                      <History className="w-6 h-6 text-orange-500" />
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-white/30 font-black uppercase tracking-widest">{format(new Date(record.created), "d MMMM yyyy", { locale: ru })}</div>
                      <div className="text-lg font-bold">{format(new Date(record.created), "HH:mm")}</div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm py-2 border-b border-white/5">
                      <span className="text-white/40">Статус</span>
                      <span className="text-green-500 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> ЗАВЕРШЕНА
                      </span>
                    </div>
                    {(record as any).calculatedLoss > 0 && (
                      <div className="flex items-center justify-between text-sm py-2 border-b border-white/5 text-red-400">
                        <span>Недостача</span>
                        <span className="font-bold">-{(record as any).calculatedLoss.toFixed(2)} ₪</span>
                      </div>
                    )}
                    {(record as any).calculatedSurplus > 0 && (
                      <div className="flex items-center justify-between text-sm py-2 border-b border-white/5 text-emerald-400">
                        <span>Излишки</span>
                        <span className="font-bold">+{(record as any).calculatedSurplus.toFixed(2)} ₪</span>
                      </div>
                    )}
                    <p className="text-sm text-white/60 italic line-clamp-2 mt-2">
                       {record.notes || "Без заметок"}
                    </p>
                  </div>
                </div>
                
                <button className="w-full bg-white/2 hover:bg-white/5 py-4 text-xs font-black uppercase tracking-[0.2em] transition-colors border-t border-white/5 group-hover:text-orange-500">
                  Посмотреть детали
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
