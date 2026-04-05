"use client";

import { useState, useEffect } from "react";
import { CreditCard, Gift, Settings2, Plus, Minus, Search, History, User } from "lucide-react";
import { useLoyaltyStore } from "@/store/useLoyaltyStore";
import { useClientsStore } from "@/store/useClientsStore";
import { AiInsightCard } from "@/components/ai/AiInsightCard";
import { useAiAdvisor } from "@/hooks/useAiAdvisor";

export default function LoyaltyPage() {
  const { settings, updateSettings, getClientPoints, addPoints, transactions } = useLoyaltyStore();
  const { clients, fetchClients } = useClientsStore();
  const ai = useAiAdvisor('crm');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isPointsModalOpen, setIsPointsModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [pointsAmount, setPointsAmount] = useState('');
  const [pointsReason, setPointsReason] = useState('Начисление бонуса');
  const [isAdding, setIsAdding] = useState(true);

  useEffect(() => {
    fetchClients();
    ai.fetchInsights();
  }, [fetchClients, ai.fetchInsights]);

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm)
  );

  const handleTransact = () => {
    if (!selectedClientId || !pointsAmount) return;
    const amountNum = Number(pointsAmount) * (isAdding ? 1 : -1);
    addPoints(selectedClientId, amountNum, pointsReason);
    setPointsAmount('');
    setIsPointsModalOpen(false);
  };

  const getClientName = (id: string) => clients.find(c => c.id === id)?.name || "Неизвестный клиент";

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
          <h1 className="text-2xl font-bold tracking-tight">CRM и Лояльность</h1>
          <p className="text-sm text-muted-foreground mt-1">Управление бонусными баллами и кэшбеком клиентов</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
        {/* Clients List */}
        <div className="lg:col-span-2 flex flex-col bg-zinc-950/30 border border-white/5 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input 
                type="text" 
                placeholder="Поиск клиентов по имени или телефону..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {filteredClients.map(client => {
              const points = getClientPoints(client.id);
              return (
                <div key={client.id} className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-xl hover:bg-zinc-800/80 transition-colors border border-transparent hover:border-white/5 group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-medium text-white">{client.name}</div>
                      <div className="text-xs text-zinc-500">{client.phone}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-sm text-zinc-400">Баланс</div>
                      <div className={`font-bold ${points > 0 ? 'text-emerald-400' : 'text-zinc-300'}`}>
                        {points} баллов
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setSelectedClientId(client.id);
                        setIsPointsModalOpen(true);
                      }}
                      className="opacity-0 group-hover:opacity-100 bg-purple-600 hover:bg-purple-500 text-white p-2 rounded-lg transition-all"
                    >
                      <Gift className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
            {filteredClients.length === 0 && (
              <div className="text-center py-10 text-zinc-500">Клиенты не найдены</div>
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="flex flex-col bg-zinc-950/30 border border-white/5 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/5 font-medium flex items-center gap-2 text-zinc-300">
            <History className="w-4 h-4" />
            История операций
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {transactions.slice(0, 50).map(t => (
              <div key={t.id} className="flex flex-col gap-1 p-3 bg-zinc-900/30 rounded-lg border border-white/5">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-zinc-200">{getClientName(t.clientId)}</span>
                  <span className={`text-sm font-bold ${t.amount > 0 ? 'text-emerald-400' : 'text-orange-400'}`}>
                    {t.amount > 0 ? '+' : ''}{t.amount}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-zinc-500">{t.reason}</span>
                  <span className="text-[10px] text-zinc-600">{new Date(t.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
            {transactions.length === 0 && (
              <div className="text-center py-10 text-sm text-zinc-500 flex flex-col items-center gap-2">
                <CreditCard className="w-8 h-8 opacity-20" />
                Пока нет начислений
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Manual Transaction Modal */}
      {isPointsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-xl font-bold mb-1">Управление баллами</h2>
            <p className="text-sm text-zinc-400 mb-6">Клиент: {getClientName(selectedClientId)}</p>
            
            <div className="flex gap-2 mb-6 p-1 bg-zinc-900 rounded-lg">
              <button 
                onClick={() => setIsAdding(true)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${isAdding ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <Plus className="w-4 h-4" /> Начислить
              </button>
              <button 
                onClick={() => setIsAdding(false)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${!isAdding ? 'bg-orange-500/20 text-orange-400' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <Minus className="w-4 h-4" /> Списать
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">СУММА БАЛЛОВ</label>
                <input 
                  type="number" 
                  value={pointsAmount}
                  onChange={(e) => setPointsAmount(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500 font-mono text-lg" 
                  placeholder="50"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">ПРИЧИНА</label>
                <input 
                  type="text" 
                  value={pointsReason}
                  onChange={(e) => setPointsReason(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-purple-500" 
                  placeholder="Например: Компенсация за долгое ожидание"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button 
                onClick={() => setIsPointsModalOpen(false)}
                className="flex-1 px-4 py-2 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 transition-colors"
              >
                Отмена
              </button>
              <button 
                onClick={handleTransact}
                disabled={!pointsAmount}
                className={`flex-1 px-4 py-2 rounded-lg text-white transition-colors disabled:opacity-50 ${isAdding ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-orange-600 hover:bg-orange-500'}`}
              >
                {isAdding ? 'Начислить' : 'Списать'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
