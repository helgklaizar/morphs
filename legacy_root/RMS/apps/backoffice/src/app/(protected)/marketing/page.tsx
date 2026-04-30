"use client";

import { useState, useEffect } from "react";
import { Plus, Megaphone, Trash2, X, Star, Users, Briefcase } from "lucide-react";
import { useMarketingStore } from "@/store/useMarketingStore";
import { ConfirmModal } from "@/components/ConfirmModal";
import { MarketingProvider, MarketingCampaign } from "@rms/types";

export default function MarketingPage() {
  const { 
    campaigns, providers, isLoading, fetchCampaigns, fetchProviders, 
    subscribeToAll, unsubscribeFromAll, addCampaign, updateCampaign, deleteCampaign,
    addProvider, updateProvider, deleteProvider
  } = useMarketingStore();

  const [activeTab, setActiveTab] = useState<'campaigns' | 'providers'>('campaigns');
  
  // Modals state
  const [showAddCampaignModal, setShowAddCampaignModal] = useState(false);
  const [showAddProviderModal, setShowAddProviderModal] = useState(false);
  
  const [editCampaign, setEditCampaign] = useState<MarketingCampaign | null>(null);
  
  // New Provider Form
  const [newProviderName, setNewProviderName] = useState("");
  const [newProviderType, setNewProviderType] = useState<'one-time'|'budget'>('one-time');

  // New Campaign Form
  const [newCampName, setNewCampName] = useState("");
  const [newCampProvider, setNewCampProvider] = useState("");
  const [newCampBudget, setNewCampBudget] = useState("");
  
  const [confirmDelete, setConfirmDelete] = useState<{ id: string, name: string, type: 'campaign'|'provider' } | null>(null);

  useEffect(() => {
    fetchCampaigns();
    fetchProviders();
    subscribeToAll();
    
    // Auto-open modal if there is a draft
    if (useMarketingStore.getState().draftMediaLink) {
       setActiveTab('campaigns');
       setShowAddCampaignModal(true);
    }

    return () => unsubscribeFromAll();
  }, [fetchCampaigns, fetchProviders, subscribeToAll, unsubscribeFromAll]);

  const handleAddProvider = async () => {
    if (newProviderName.trim()) {
      await addProvider({ name: newProviderName.trim(), contract_type: newProviderType });
      setShowAddProviderModal(false);
      setNewProviderName("");
    }
  };

  const handleAddCampaign = async () => {
    const mediaLink = useMarketingStore.getState().draftMediaLink;
    if (newCampName.trim() && newCampProvider) {
      await addCampaign({ 
        name: newCampName.trim(), 
        provider_id: newCampProvider,
        budget: Number(newCampBudget) || 0,
        media_link: mediaLink || undefined
      });
      useMarketingStore.getState().setDraftMediaLink(null);
      setShowAddCampaignModal(false);
      setNewCampName("");
      setNewCampProvider("");
      setNewCampBudget("");
    }
  };

  const closeCampModal = () => {
    useMarketingStore.getState().setDraftMediaLink(null);
    setShowAddCampaignModal(false);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    if (confirmDelete.type === 'campaign') {
      await deleteCampaign(confirmDelete.id);
    } else {
      await deleteProvider(confirmDelete.id);
    }
    setConfirmDelete(null);
  };

  const renderStars = (rating: number = 0) => {
    return Array(5).fill(0).map((_, i) => (
      <Star key={i} className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} />
    ));
  };

  const getProviderAvgRating = (provId: string) => {
    const provCamps = campaigns.filter(c => c.provider_id === provId && c.rating && c.rating > 0);
    if (provCamps.length === 0) return 0;
    const sum = provCamps.reduce((acc, c) => acc + (c.rating || 0), 0);
    return Math.round(sum / provCamps.length);
  };

  const getProviderTotalSpent = (provId: string) => {
    return campaigns.filter(c => c.provider_id === provId).reduce((acc, c) => acc + (c.budget || 0), 0);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Маркетинг</h1>
          <p className="text-sm text-muted-foreground mt-1">Рекламные кампании и провайдеры (CRM)</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'providers' ? (
            <button 
              onClick={() => setShowAddProviderModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold transition-colors"
            >
              <Plus className="w-4 h-4" /> Новый Провайдер
            </button>
          ) : (
            <button 
              onClick={() => setShowAddCampaignModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition-colors"
            >
              <Plus className="w-4 h-4" /> Новая Кампания
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <button 
          onClick={() => setActiveTab('campaigns')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all ${activeTab === 'campaigns' ? 'bg-orange-500 text-white shadow-lg' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
        >
          <Megaphone className="w-5 h-5" /> Кампании
        </button>
        <button 
          onClick={() => setActiveTab('providers')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all ${activeTab === 'providers' ? 'bg-indigo-500 text-white shadow-lg' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
        >
          <Briefcase className="w-5 h-5" /> Провайдеры рекламы
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-10 max-w-5xl pr-4">
        {isLoading ? (
          <div className="flex h-64 flex-col items-center justify-center w-full">
            <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin mb-4" />
          </div>
        ) : activeTab === 'campaigns' ? (
          <>
            {campaigns.length === 0 ? (
               <div className="flex h-64 flex-col items-center justify-center w-full">
                <Megaphone className="h-16 w-16 text-[#2A2A2A] mb-4" />
                <p className="text-xl font-semibold text-gray-500 text-center">Нет ни одной компании.<br/>Нажмите "+", чтобы создать.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {campaigns.map(camp => (
                  <div key={camp.id} className="flex flex-col p-5 bg-[#1C1C1C] rounded-xl border border-white/5 hover:bg-[#242424] transition-colors group">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-1 items-center gap-4">
                         <div className="w-12 h-12 rounded-full bg-orange-600/20 text-orange-500 flex items-center justify-center shrink-0">
                           <Megaphone className="w-6 h-6" />
                         </div>
                         <div>
                            <h3 className="font-bold text-lg leading-tight mb-1">{camp.name}</h3>
                            <div className="flex items-center gap-3 text-sm text-white/60">
                              <span>Статус: <b className={camp.status === 'Черновик' ? 'text-gray-400' : 'text-green-500'}>{camp.status}</b></span>
                              <span>Провайдер: <b>{camp.expand?.provider_id?.name || '—'}</b></span>
                              <span>Бюджет: <b>{camp.budget || 0} ₪</b></span>
                            </div>
                         </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-1">
                          {renderStars(camp.rating)}
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setEditCampaign(camp)} className="px-4 py-1.5 rounded bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors">
                            Настроить
                          </button>
                          <button 
                            onClick={() => setConfirmDelete({ id: camp.id, name: camp.name, type: 'campaign' })}
                            className="p-1.5 rounded bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                    {camp.comments && (
                      <div className="mt-4 pt-4 border-t border-white/5 text-sm text-gray-400 italic">
                        "{camp.comments}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {providers.length === 0 ? (
               <div className="flex h-64 flex-col items-center justify-center w-full">
                <Briefcase className="h-16 w-16 text-[#2A2A2A] mb-4" />
                <p className="text-xl font-semibold text-gray-500 text-center">Нет ни одного провайдера.<br/>Нажмите "+", чтобы добавить.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {providers.map(prov => {
                  const avgRating = getProviderAvgRating(prov.id);
                  const totalSpent = getProviderTotalSpent(prov.id);
                  return (
                  <div key={prov.id} className="p-5 bg-[#1C1C1C] rounded-xl border border-white/5 hover:border-indigo-500/30 transition-colors flex flex-col relative">
                    <button 
                      onClick={() => setConfirmDelete({ id: prov.id, name: prov.name, type: 'provider' })}
                      className="absolute top-4 right-4 p-1.5 rounded bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <h3 className="font-bold text-lg mb-2 pr-8">{prov.name}</h3>
                    <div className="flex items-center gap-2 mb-4">
                       <span className="px-2 py-0.5 rounded bg-white/10 text-xs font-medium text-white/70">
                         {prov.contract_type === 'budget' ? 'По бюджету' : 'Разовый'}
                       </span>
                    </div>
                    <div className="space-y-2 mt-auto">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Потрачено всего:</span>
                        <span className="font-bold">{totalSpent} ₪</span>
                      </div>
                      <div className="flex justify-between text-sm items-center">
                        <span className="text-gray-400">Средний успех:</span>
                        <span className="flex gap-0.5">{renderStars(avgRating)}</span>
                      </div>
                    </div>
                  </div>
                )})}
              </div>
            )}
          </>
        )}
      </div>

      {showAddProviderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && setShowAddProviderModal(false)}>
          <div className="bg-[#1a1a1a] rounded-2xl p-6 w-full max-w-sm border border-white/10 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button onClick={() => setShowAddProviderModal(false)} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-bold mb-6">Новый Провайдер</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-white/50 mb-1 block">Название (Telegram канал, Блогер, и тд)</label>
                <input 
                  type="text" 
                  value={newProviderName} 
                  autoFocus
                  onChange={e => setNewProviderName(e.target.value)} 
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white outline-none focus:border-indigo-500 transition-colors"
                  placeholder="Например: Жизнь в ТА"
                />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Тип контракта</label>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setNewProviderType('one-time')}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors border ${newProviderType === 'one-time' ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' : 'border-white/10 text-white/50 hover:bg-white/5'}`}
                  >
                    Разовый
                  </button>
                  <button 
                    onClick={() => setNewProviderType('budget')}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors border ${newProviderType === 'budget' ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' : 'border-white/10 text-white/50 hover:bg-white/5'}`}
                  >
                    Бюджетный
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setShowAddProviderModal(false)} className="flex-1 py-2.5 rounded-xl font-bold text-white/70 hover:bg-white/5 transition-colors">
                Отмена
              </button>
              <button 
                onClick={handleAddProvider}
                disabled={!newProviderName.trim()} 
                className="flex-[2] py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold transition-colors disabled:opacity-50"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddCampaignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && closeCampModal()}>
          <div className="bg-[#1a1a1a] rounded-2xl p-6 w-full max-w-md border border-white/10 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button onClick={() => closeCampModal()} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-bold mb-6">Новая Кампания</h2>
            
            {useMarketingStore.getState().draftMediaLink && (
               <div className="mb-4 p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl flex items-center gap-3">
                 <img src={useMarketingStore.getState().draftMediaLink!} alt="Draft" className="w-12 h-12 rounded object-cover" />
                 <div className="text-xs text-indigo-300">
                   Рекламный материал прикреплен из Документов
                 </div>
               </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-xs text-white/50 mb-1 block">Название кампании</label>
                <input 
                  type="text" 
                  value={newCampName} 
                  autoFocus
                  onChange={e => setNewCampName(e.target.value)} 
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white outline-none focus:border-orange-500 transition-colors"
                  placeholder="Осенняя акция"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Провайдер</label>
                  <select 
                    value={newCampProvider}
                    onChange={(e) => setNewCampProvider(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white outline-none focus:border-orange-500 transition-colors"
                  >
                    <option value="" disabled>Выберите...</option>
                    {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Бюджет (₪)</label>
                  <input 
                    type="number" 
                    value={newCampBudget} 
                    onChange={e => setNewCampBudget(e.target.value)} 
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white outline-none focus:border-orange-500 transition-colors"
                    placeholder="300"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => closeCampModal()} className="flex-1 py-2.5 rounded-xl font-bold text-white/70 hover:bg-white/5 transition-colors">
                Отмена
              </button>
              <button 
                onClick={handleAddCampaign}
                disabled={!newCampName.trim() || !newCampProvider} 
                className="flex-[2] py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold transition-colors disabled:opacity-50"
              >
                Создать
              </button>
            </div>
          </div>
        </div>
      )}

      {editCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && setEditCampaign(null)}>
          <div className="bg-[#1a1a1a] rounded-2xl p-6 w-full max-w-md border border-white/10 shadow-2xl relative animate-in fade-in zoom-in duration-200" onClick={e=>e.stopPropagation()}>
            <button onClick={() => setEditCampaign(null)} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-bold mb-6">Оценка Кампании</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs text-white/50 mb-1 block">Оценка (1-5)</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(rating => (
                    <button 
                      key={rating}
                      onClick={() => setEditCampaign({...editCampaign, rating})}
                      className="p-2"
                    >
                      <Star className={`w-8 h-8 transition-colors ${editCampaign.rating && editCampaign.rating >= rating ? 'text-yellow-400 fill-yellow-400 scale-110' : 'text-gray-600 hover:text-gray-400'}`} />
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="text-xs text-white/50 mb-1 block">Статус</label>
                <select 
                  value={editCampaign.status}
                  onChange={e => setEditCampaign({...editCampaign, status: e.target.value})}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white outline-none focus:border-orange-500 transition-colors"
                >
                  <option value="Черновик">Черновик</option>
                  <option value="Активна">Активна</option>
                  <option value="Завершена">Завершена</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-white/50 mb-1 block">Итоги / Комментарий</label>
                <textarea 
                  value={editCampaign.comments || ""} 
                  onChange={e => setEditCampaign({...editCampaign, comments: e.target.value})} 
                  rows={3}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white outline-none focus:border-orange-500 transition-colors resize-none"
                  placeholder="Отличный приход клиентов, окупилось х3"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={() => setEditCampaign(null)} className="flex-1 py-2.5 rounded-xl font-bold text-white/70 hover:bg-white/5 transition-colors">
                Отмена
              </button>
              <button 
                onClick={async () => {
                  await updateCampaign(editCampaign.id, { 
                    status: editCampaign.status, 
                    rating: editCampaign.rating, 
                    comments: editCampaign.comments 
                  });
                  setEditCampaign(null);
                }}
                className="flex-[2] py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold transition-colors"
              >
                Сохранить итоги
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmModal
          title={`Удаление ${confirmDelete.type === 'provider' ? 'провайдера' : 'кампании'}`}
          message={`Вы уверены что хотите удалить "${confirmDelete.name}"? Это действие необратимо.`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
