"use client";

import { useEffect, useState, useMemo } from "react";
import { Bot, Save, AlertTriangle, Store, Package, FileText, Check, Trash2 } from "lucide-react";
import { useProcurementStore } from "@/store/useProcurementStore";
import { format } from "date-fns";

export default function ProcurementPage() {
  const { suggestions, drafts, isLoading, fetchSuggestions, fetchDrafts, createDrafts, executeDraft, deleteDraft, receiveOrder } = useProcurementStore();
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"ai" | "drafts" | "ordered">("ai");

  const uniqueSuppliers = useMemo(() => {
    if (activeTab === "ai") {
      return Array.from(new Set(suggestions.map(s => s.supplier))).filter(Boolean).sort();
    }
    const currentStatus = activeTab === "ordered" ? "ordered" : "draft";
    return Array.from(new Set(drafts.filter(d => d.status === currentStatus).map(d => d.supplierName))).filter(Boolean).sort();
  }, [suggestions, drafts, activeTab]);

  const filteredSuggestions = useMemo(() => {
    if (supplierFilter === "all") return suggestions;
    return suggestions.filter(s => s.supplier === supplierFilter);
  }, [suggestions, supplierFilter]);

  const filteredDrafts = useMemo(() => {
    const currentStatus = activeTab === "ordered" ? "ordered" : "draft";
    let filtered = drafts.filter(d => d.status === currentStatus);
    if (supplierFilter !== "all") {
      filtered = filtered.filter(d => d.supplierName === supplierFilter);
    }
    return filtered;
  }, [drafts, supplierFilter, activeTab]);

  useEffect(() => {
    fetchSuggestions();
    fetchDrafts();
  }, [fetchSuggestions, fetchDrafts]);

  if (isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#8B5CF6] border-t-transparent animate-spin mb-4" />
        <p className="text-white/60">Анализируем историю продаж и остатки...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col animate-in fade-in">
      <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6 shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Закупки</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Автоматический анализ расхода запасов и формирование заявок
          </p>
        </div>
        
        {suggestions.length > 0 && (
          <button 
            onClick={() => createDrafts(suggestions)}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-black transition-all shadow-lg shadow-[#8B5CF6]/20"
          >
            <Save className="w-5 h-5" />
            Одобрить и создать драфты ({suggestions.length})
          </button>
        )}
      </div>

      <div className="flex bg-[#141414] p-1.5 rounded-xl border border-white/5 shadow-inner mb-6 shrink-0 w-fit">
        <button 
          onClick={() => { setActiveTab("ai"); setSupplierFilter("all"); }}
          className={`px-5 py-2 font-bold text-sm transition-all rounded-lg flex items-center gap-2 ${activeTab === "ai" ? "bg-[#8B5CF6] text-white shadow-md shadow-[#8B5CF6]/20" : "text-white/40 hover:text-white/80"}`}
        >
          ИИ Прогноз
          {suggestions.length > 0 && <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">{suggestions.length}</span>}
        </button>
        <button 
          onClick={() => { setActiveTab("drafts"); setSupplierFilter("all"); }}
          className={`px-5 py-2 font-bold text-sm transition-all rounded-lg flex items-center gap-2 ${activeTab === "drafts" ? "bg-[#8B5CF6] text-white shadow-md shadow-[#8B5CF6]/20" : "text-white/40 hover:text-white/80"}`}
        >
          Черновики
          {drafts.filter(d => d.status === 'draft').length > 0 && <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">{drafts.filter(d => d.status === 'draft').length}</span>}
        </button>
        <button 
          onClick={() => { setActiveTab("ordered"); setSupplierFilter("all"); }}
          className={`px-5 py-2 font-bold text-sm transition-all rounded-lg flex items-center gap-2 ${activeTab === "ordered" ? "bg-[#8B5CF6] text-white shadow-md shadow-[#8B5CF6]/20" : "text-white/40 hover:text-white/80"}`}
        >
          Утвержденные
          {drafts.filter(d => d.status === 'ordered').length > 0 && <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">{drafts.filter(d => d.status === 'ordered').length}</span>}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === "ai" ? (
          suggestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Bot className="w-16 h-16 text-white/10 mb-4" />
              <h2 className="text-xl font-bold text-white/50">Всё под контролем</h2>
              <p className="text-sm text-white/30 max-w-sm mt-2">
                Запасов достаточно для бесперебойной работы. AI не обнаружил позиций, требующих срочного заказа.
              </p>
            </div>
          ) : (
          <>
            {uniqueSuppliers.length > 1 && (
              <div className="flex flex-wrap gap-2 mb-6 shrink-0">
                <button 
                  onClick={() => setSupplierFilter('all')} 
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${supplierFilter === 'all' ? 'bg-white text-black shadow-lg' : 'bg-[#1a1a1a] text-white/50 hover:bg-[#242424]'}`}
                >
                  Все поставщики
                </button>
                {uniqueSuppliers.map(sup => (
                  <button 
                    key={sup!} 
                    onClick={() => setSupplierFilter(sup!)} 
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${supplierFilter === sup ? 'bg-[#8B5CF6] text-white shadow-lg shadow-[#8B5CF6]/20' : 'bg-[#1a1a1a] text-white/50 hover:bg-[#242424]'}`}
                  >
                    {sup}
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2 pb-10">
              {filteredSuggestions.map((sug, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-[#111] rounded-2xl border border-white/5 hover:bg-[#1a1a1a] transition-colors group">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                    <Package className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base uppercase leading-tight">{sug.name}</h3>
                    <div className="flex items-center gap-2 mt-1 text-white/40 text-xs">
                      <Store className="w-3 h-3" />
                      <span className="truncate max-w-[200px]">{sug.supplier}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-8 px-8">
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-white/30 uppercase font-black mb-1">Остаток</span>
                    <span className="text-sm font-bold text-red-400">{sug.currentStock}</span>
                  </div>
                  {sug.daysLeft !== undefined && sug.burnPerDay !== undefined && sug.burnPerDay > 0 && (
                     <div className="flex flex-col items-center">
                       <span className="text-[10px] text-[#8B5CF6]/50 uppercase font-black mb-1">Прогноз AI (Хватит на)</span>
                       <span className={`text-sm font-bold ${sug.daysLeft <= 4 ? "text-red-400" : "text-emerald-400"}`}>{sug.daysLeft} дн.</span>
                       <span className="text-[10px] text-white/20 mt-0.5">({sug.burnPerDay} в день)</span>
                     </div>
                  )}
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-white/30 uppercase font-black mb-1">Мин. планка</span>
                    <span className="text-sm font-bold text-white/60">{sug.minStock}</span>
                  </div>
                </div>

                <div className="flex items-center gap-6 justify-end min-w-[200px]">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-[#8B5CF6] uppercase font-black mb-1">Рекомендуем</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-bold text-white">{sug.suggestedOrderQty}</span>
                      {sug.estimatedCost > 0 && (
                        <span className="text-sm font-bold text-emerald-400">
                          ~{sug.estimatedCost.toFixed(0)} ₪
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          </>
          )
        ) : (
          /* DRAFTS TAB */
          drafts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <FileText className="w-16 h-16 text-white/10 mb-4" />
              <h2 className="text-xl font-bold text-white/50">Нет черновиков</h2>
              <p className="text-sm text-white/30 max-w-sm mt-2">
                Сгенерируйте заказы на вкладке прогноза.
              </p>
            </div>
          ) : (
            <>
            {uniqueSuppliers.length > 1 && (
              <div className="flex flex-wrap gap-2 mb-6 shrink-0">
                <button 
                  onClick={() => setSupplierFilter('all')} 
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${supplierFilter === 'all' ? 'bg-white text-black shadow-lg' : 'bg-[#1a1a1a] text-white/50 hover:bg-[#242424]'}`}
                >
                  Все поставщики
                </button>
                {uniqueSuppliers.map(sup => (
                  <button 
                    key={sup!} 
                    onClick={() => setSupplierFilter(sup!)} 
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${supplierFilter === sup ? 'bg-[#8B5CF6] text-white shadow-lg shadow-[#8B5CF6]/20' : 'bg-[#1a1a1a] text-white/50 hover:bg-[#242424]'}`}
                  >
                    {sup}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 pb-10">
              {filteredDrafts.map((draft) => {
                let itemsList: any[] = [];
                try { itemsList = JSON.parse(draft.items); } catch(e){}

                return (
                  <div key={draft.id} className="bg-[#111] border border-white/10 rounded-2xl p-5 flex flex-col">
                    <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                      <div>
                        <h3 className="font-black uppercase text-white mb-1">{draft.supplierName}</h3>
                        <p className="text-xs text-white/40 font-mono">{format(new Date(draft.created), "dd.MM.yyyy HH:mm")}</p>
                      </div>
                      <div className={`px-2 py-1 rounded border text-xs font-bold uppercase ${draft.status === 'ordered' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'}`}>
                        {draft.status === 'ordered' ? 'Отправлен' : 'Черновик'}
                      </div>
                    </div>

                    <div className="flex-1 mb-4 space-y-2">
                       {itemsList.map((it: any, i: number) => (
                         <div key={i} className="flex items-center justify-between text-sm bg-white/5 p-2 rounded-lg">
                           <span className="font-medium">{it.name}</span>
                           <span className="font-mono text-white/50">{it.quantity} шт</span>
                         </div>
                       ))}
                    </div>

                    <div className="flex items-center justify-between border-t border-white/5 pt-4">
                      <div>
                        <p className="text-[10px] text-white/30 uppercase font-black tracking-widest mb-1">Сумма</p>
                        <p className="text-xl font-bold text-emerald-400">~{draft.total_amount} ₪</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => deleteDraft(draft.id)} className="p-2.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors" title="Удалить">
                          <Trash2 className="w-5 h-5" />
                        </button>
                        {draft.status === 'draft' && (
                          <button onClick={() => executeDraft(draft.id)} className="flex items-center gap-2 px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg font-bold transition-colors">
                            <Check className="w-4 h-4" /> Оформить
                          </button>
                        )}
                        {draft.status === 'ordered' && (
                          <button onClick={() => receiveOrder(draft.id)} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold transition-colors">
                            <Check className="w-4 h-4" /> Принять на склад
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            </>
          )
        )}
      </div>
    </div>
  );
}
