"use client";

import { useState } from "react";
import { Plus, Tag, Trash2, Power } from "lucide-react";
import { usePromocodesStore } from "@/store/usePromocodesStore";
import { AiInsightCard } from "@/components/ai/AiInsightCard";
import { useAiAdvisor } from "@/hooks/useAiAdvisor";

export default function PromocodesPage() {
  const { promocodes, addCode, toggleStatus, deleteCode } = usePromocodesStore();
  const ai = useAiAdvisor('crm');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState("");
  const [maxUses, setMaxUses] = useState("");

  const handleCreate = () => {
    if (!newCode || !discountValue) return;
    addCode({
      code: newCode.toUpperCase(),
      discountType,
      discountValue: Number(discountValue),
      isActive: true,
      maxUses: maxUses ? Number(maxUses) : null
    });
    setNewCode("");
    setDiscountValue("");
    setMaxUses("");
    setIsModalOpen(false);
  };

  return (
    <div className="flex h-full flex-col">
      <AiInsightCard 
        module="crm" 
        insights={ai.insights} 
        isLoading={ai.isLoading} 
        onRefresh={ai.fetchInsights}
        className="mb-6 shrink-0" 
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-white/10 mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Промокоды и Акции</h1>
          <p className="text-sm text-muted-foreground mt-1">Управление скидочными купонами и акциями лендинга</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-lg shadow-orange-500/20"
        >
          <Plus className="w-4 h-4" />
          Создать промокод
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {promocodes.map(p => (
          <div key={p.id} className={`p-5 rounded-xl border transition-colors ${p.isActive ? 'border-orange-500/30 bg-orange-500/5' : 'border-zinc-800 bg-zinc-900/50'}`}>
            <div className="flex w-full justify-between items-start mb-4">
              <div className="flex items-center gap-2 bg-zinc-950 px-3 py-1 rounded-md border border-white/10">
                <Tag className={`w-4 h-4 ${p.isActive ? 'text-orange-400' : 'text-zinc-500'}`} />
                <span className="font-mono font-bold tracking-wider">{p.code}</span>
              </div>
              <button onClick={() => deleteCode(p.id)} className="text-zinc-500 hover:text-red-400">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-2 mb-4">
              <div className="text-3xl font-black">
                {p.discountType === 'percentage' ? `${p.discountValue}%` : `${p.discountValue} ₪`}
              </div>
              <div className="text-sm text-zinc-400">
                Использован {p.uses} раз {p.maxUses ? `из ${p.maxUses}` : ''}
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex justify-between items-center">
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${p.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}`}>
                {p.isActive ? 'АКТИВЕН' : 'ОТКЛЮЧЕН'}
              </span>
              <button 
                onClick={() => toggleStatus(p.id)}
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white"
              >
                <Power className="w-3.5 h-3.5" />
                {p.isActive ? 'Отключить' : 'Включить'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Новый промокод</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">КОД PROMO (ЛАТИНИЦА)</label>
                <input 
                  type="text" 
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 font-mono uppercase focus:outline-none focus:border-orange-500" 
                  placeholder="NEWYEAR20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">ТИП СКИДКИ</label>
                  <select 
                    value={discountType}
                    onChange={(e: any) => setDiscountType(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-orange-500"
                  >
                    <option value="percentage">Проценты (%)</option>
                    <option value="fixed">Фикс. сумма (₪)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">ЗНАЧЕНИЕ</label>
                  <input 
                    type="number" 
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 focus:outline-none focus:border-orange-500" 
                    placeholder="10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">ЛИМИТ ИСПОЛЬЗОВАНИЙ (0 = БЕЗ ЛИМИТА)</label>
                <input 
                  type="number" 
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 focus:outline-none focus:border-orange-500" 
                  placeholder="Оставьте пустым для безлимита"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-4 py-2 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 transition-colors"
              >
                Отмена
              </button>
              <button 
                onClick={handleCreate}
                disabled={!newCode || !discountValue}
                className="flex-1 px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-500 transition-colors disabled:opacity-50"
              >
                Создать
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
