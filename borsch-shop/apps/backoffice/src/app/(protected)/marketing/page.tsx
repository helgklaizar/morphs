"use client";

import { useState, useEffect } from "react";
import { Plus, Megaphone, Trash2, X } from "lucide-react";
import { useMarketingStore } from "@/store/useMarketingStore";
import { ConfirmModal } from "@/components/ConfirmModal";

export default function MarketingPage() {
  const { campaigns, isLoading, fetchCampaigns, subscribeToCampaigns, unsubscribeFromCampaigns, addCampaign, deleteCampaign } = useMarketingStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<{ id: string, name: string } | null>(null);

  const handleAdd = async () => {
    if (newName.trim()) {
      await addCampaign(newName.trim());
      setShowAddModal(false);
      setNewName("");
    }
  };

  useEffect(() => {
    fetchCampaigns();
    subscribeToCampaigns();
    return () => unsubscribeFromCampaigns();
  }, [fetchCampaigns, subscribeToCampaigns, unsubscribeFromCampaigns]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Маркетинг</h1>
          <p className="text-sm text-muted-foreground mt-1">Акции и рассылки</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition-colors"
        >
          <Plus className="w-4 h-4" />
          Компания
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-10 max-w-4xl">
        {isLoading && campaigns.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center w-full">
            <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin mb-4" />
            <p className="text-xl font-semibold text-gray-500">Загрузка...</p>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center w-full">
            <Megaphone className="h-16 w-16 text-[#2A2A2A] mb-4" />
            <p className="text-xl font-semibold text-gray-500 text-center">Нет ни одной компании.<br/>Нажмите "+", чтобы создать.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map(camp => (
              <div key={camp.id} className="flex items-center p-4 bg-[#1C1C1C] rounded-xl border border-white/5 hover:bg-[#242424] transition-colors group">
                <div className="w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center mr-4 shrink-0">
                  <Megaphone className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 flex flex-col justify-center pr-4">
                  <h3 className="font-bold text-base leading-tight mb-1">{camp.name}</h3>
                  <div className="text-sm text-white/60">
                    Статус: <span className={camp.status === 'Черновик' ? 'text-gray-400' : 'text-green-500'}>{camp.status}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => alert("Настройки маркетинга в разработке")} className="px-4 py-1.5 rounded bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors">
                    Настроить
                  </button>
                  <button 
                    onClick={() => setConfirmDelete({ id: camp.id, name: camp.name })}
                    className="p-1.5 rounded bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && setShowAddModal(false)}>
          <div className="bg-[#1a1a1a] rounded-2xl p-6 w-full max-w-sm border border-white/10 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-bold mb-6">Новая компания</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-white/50 mb-1 block">Название компании</label>
                <input 
                  type="text" 
                  value={newName} 
                  autoFocus
                  onChange={e => setNewName(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  className="w-full bg-[#242424] rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 border border-white/5" 
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6 pt-4 border-t border-white/10">
              <button onClick={handleAdd} className="w-full py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 font-bold text-sm transition-colors text-white">
                Создать
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Удалить компанию?"
          message={`Точно удалить компанию "${confirmDelete.name}"? Это действие необратимо.`}
          onConfirm={() => deleteCampaign(confirmDelete.id)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
