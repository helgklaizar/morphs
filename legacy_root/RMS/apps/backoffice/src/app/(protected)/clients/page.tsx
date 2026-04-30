"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Plus, 
  User, 
  ChevronRight, 
  Trash2, 
  X, 
  ArrowLeft, 
  Phone, 
  MapPin, 
  ShoppingBag, 
  CreditCard, 
  Calendar,
  Moon,
  Star,
  Users
} from "lucide-react";
import { format } from "date-fns";
import { useClientsStore } from "@/store/useClientsStore";
import { useOrdersStore } from "@/store/useOrdersStore";
import { useHistoryStore } from "@/store/useHistoryStore";
import { ConfirmModal } from "@/components/ConfirmModal";
import { pb } from "@/lib/pocketbase";
import { AiInsightCard } from "@/components/ai/AiInsightCard";
import { useAiAdvisor } from "@/hooks/useAiAdvisor";

export default function ClientsPage() {
  const { clients, isLoading, fetchClients, subscribeToClients, unsubscribeFromClients, addClient, updateClient, deleteClient } = useClientsStore();
  const { orders: activeOrders, fetchOrders } = useOrdersStore();
  const { history: historyOrders, fetchHistory } = useHistoryStore();
  
  const ai = useAiAdvisor('crm');
  
  useEffect(() => {
    ai.fetchInsights();
  }, [ai.fetchInsights]);
  
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientData, setClientData] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<{ id: string, name: string } | null>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  
  const [segmentFilter, setSegmentFilter] = useState<'all' | 'sleeping' | 'top'>('all');

  const allOrdersList = useMemo(() => [...activeOrders, ...historyOrders], [activeOrders, historyOrders]);

  const clientStats = useMemo(() => {
    return clients.map(client => {
      const clientOrders = allOrdersList.filter(o => o.customerPhone === client.phone);
      const totalSpent = clientOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const orderCount = clientOrders.length;
      const averageCheck = orderCount > 0 ? totalSpent / orderCount : 0;
      
      const lastOrderDate = clientOrders.reduce((latest, o) => {
        const d = new Date(o.createdAt);
        return d > latest ? d : latest;
      }, new Date(0));

      const daysSinceLastOrder = orderCount > 0 
        ? Math.floor((new Date().getTime() - lastOrderDate.getTime()) / (1000 * 3600 * 24)) 
        : Infinity;

      return {
        ...client,
        totalSpent,
        orderCount,
        averageCheck,
        daysSinceLastOrder,
      };
    });
  }, [clients, allOrdersList]);

  const filteredClients = useMemo(() => {
    let list = [...clientStats];
    if (segmentFilter === 'sleeping') {
      // уснувшие = не было заказов больше 30 дней, но есть хотя бы один заказ
      list = list.filter(c => c.daysSinceLastOrder > 30 && c.daysSinceLastOrder !== Infinity);
      list.sort((a, b) => b.daysSinceLastOrder - a.daysSinceLastOrder);
    } else if (segmentFilter === 'top') {
      // Топ = средний чек > 100 или потратили много (упростим: средний чек по убыванию)
      list = list.filter(c => c.orderCount > 0);
      list.sort((a, b) => b.averageCheck - a.averageCheck);
    } else {
      // по убыванию времени создания
      list.sort((a,b) => new Date(b.created).getTime() - new Date(a.created).getTime());
    }
    return list;
  }, [clientStats, segmentFilter]);

  useEffect(() => {
    fetchClients();
    fetchOrders();
    fetchHistory();
    subscribeToClients();
    return () => unsubscribeFromClients();
  }, [fetchClients, fetchOrders, fetchHistory, subscribeToClients, unsubscribeFromClients]);

  const getClientOrdersCount = (phone: string) => {
    return allOrdersList.filter(o => o.customerPhone === phone).length;
  };

  const loadClientDetails = async (id: string) => {
    setIsDetailLoading(true);
    try {
      const client = await pb.collection('clients').getOne(id);
      setClientData(client);
      const ordersData = await pb.collection('orders').getFullList({
        filter: pb.filter('customer_phone = {:phone}', { phone: client.phone }),
        sort: '-created',
      });
      setOrders(ordersData);
      setSelectedClientId(id);
    } catch (err) {
      console.error("Failed to load details:", err);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleAdd = async () => {
    if (newName && newPhone) {
      await addClient({ name: newName.trim(), phone: newPhone.trim(), address: '' });
      setShowAddModal(false);
      setNewName("");
      setNewPhone("");
    }
  };

  const totalSpent = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

  // --- DETAIL VIEW ---
  if (selectedClientId && clientData) {
    return (
      <div className="space-y-6 max-w-5xl animate-in fade-in slide-in-from-right-4 duration-300 pb-20">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setSelectedClientId(null)}
            className="flex items-center gap-2 text-white/50 hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span>Назад к списку</span>
          </button>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                setEditName(clientData.name);
                setEditPhone(clientData.phone);
                setEditAddress(clientData.address || '');
                setShowEditModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-white hover:bg-white/10 transition-all text-sm font-bold"
            >
              <User className="w-4 h-4" />
              Редактировать
            </button>
            <button 
              onClick={() => setConfirmDeleteId({ id: clientData.id, name: clientData.name })}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all text-sm font-bold"
            >
              <Trash2 className="w-4 h-4" />
              Удалить
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-6">
            <div className="bg-[#141414] border border-white/5 rounded-3xl p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-3xl -mr-16 -mt-16 rounded-full" />
              <div className="w-16 h-16 rounded-2xl bg-orange-500 flex items-center justify-center mb-6 relative z-10 shadow-lg shadow-orange-500/20">
                <User className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-black tracking-tight mb-2 uppercase leading-none">{clientData.name}</h1>
              <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-6 border-b border-white/5 pb-4">Информация</p>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                    <Phone className="w-4 h-4 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-white/30 font-black uppercase tracking-widest">Телефон</p>
                    <p className="text-sm font-bold">{clientData.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-white/30 font-black uppercase tracking-widest">Адрес</p>
                    <p className="text-sm font-bold">{clientData.address || "Не указан"}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#141414] border border-white/5 rounded-3xl p-6">
              <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-4">Статистика</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-2xl font-black text-white leading-none">{orders.length}</p>
                  <p className="text-[10px] text-white/40 font-bold uppercase">Заказов</p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-black text-orange-500 leading-none">{totalSpent} ₪</p>
                  <p className="text-[10px] text-white/40 font-bold uppercase">Потрачено</p>
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 space-y-4">
            <h2 className="text-xl font-black flex items-center gap-3 uppercase tracking-tight pl-2">
              <ShoppingBag className="w-5 h-5 text-orange-500" />
              История заказов
            </h2>
            <div className="space-y-3">
              {orders.length === 0 ? (
                <div className="bg-white/5 rounded-3xl p-12 text-center border border-dashed border-white/10">
                  <p className="text-white/40 font-bold uppercase tracking-widest text-xs">Заказов нет</p>
                </div>
              ) : (
                orders.map(order => (
                  <div key={order.id} className="flex items-center p-4 bg-[#141414] border border-white/5 rounded-2xl">
                    <div className="w-12 h-12 rounded-xl bg-black/40 flex items-center justify-center mr-4">
                      <ShoppingBag className="w-5 h-5 text-white/40" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold">Заказ #{order.id.slice(-4).toUpperCase()}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase ${
                          order.status === 'completed' ? 'bg-green-500/10 text-green-500' : 
                          order.status === 'cancelled' ? 'bg-red-500/10 text-red-500' : 'bg-orange-500/10 text-orange-500'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] font-bold text-white/30 uppercase tracking-widest">
                        <span><Calendar className="inline w-3 h-3 mr-1" /> {new Date(order.created).toLocaleDateString()}</span>
                        <span><CreditCard className="inline w-3 h-3 mr-1" /> {order.total_amount} ₪</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {confirmDeleteId && (
          <ConfirmModal
            title="Удалить клиента и ЗАКАЗЫ?"
            message={`ВНИМАНИЕ: Это действие удалит клиента "${confirmDeleteId.name}" и абсолютно все связанные с ним заказы (${orders.length} шт.) навсегда.`}
            onConfirm={async () => {
              await deleteClient(confirmDeleteId.id);
              setConfirmDeleteId(null);
              setSelectedClientId(null);
            }}
            onCancel={() => setConfirmDeleteId(null)}
          />
        )}
      </div>
    );
  }

  // --- LIST VIEW ---
  return (
    <div className="flex h-full flex-col">
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Клиенты</h1>
          <p className="text-sm text-muted-foreground mt-1 font-bold text-[10px] tracking-widest opacity-50">База клиентов и статистика</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition-colors tracking-widest shadow-lg shadow-orange-500/20 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Добавить
        </button>
      </div>

      <AiInsightCard 
        module="crm" 
        insights={ai.insights} 
        isLoading={ai.isLoading} 
        onRefresh={ai.fetchInsights}
        className="mb-6 shrink-0 max-w-4xl"
      />

      <div className="flex items-center gap-3 mb-6">
        <button 
           onClick={() => setSegmentFilter('all')}
           className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${segmentFilter === 'all' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/80'}`}
        >
          <Users className="w-4 h-4" />
          Все клиенты
        </button>
        <button 
           onClick={() => setSegmentFilter('sleeping')}
           className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${segmentFilter === 'sleeping' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-white/5 text-white/40 hover:text-white/80'}`}
        >
          <Moon className="w-4 h-4" />
          Уснувшие {segmentFilter === 'all' && <span className="opacity-50 text-[10px]">(&gt;30 дней)</span>}
        </button>
        <button 
           onClick={() => setSegmentFilter('top')}
           className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${segmentFilter === 'top' ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' : 'bg-white/5 text-white/40 hover:text-white/80'}`}
        >
          <Star className="w-4 h-4" />
          Топ чек
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-10 max-w-4xl custom-scrollbar">
        {isLoading && filteredClients.length === 0 ? (
          <div className="flex h-64 items-center justify-center w-full"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent animate-spin rounded-full" /></div>
        ) : filteredClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-white/30 text-sm font-bold uppercase tracking-widest">
            Нет клиентов в этой категории
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredClients.map(client => (
              <div 
                key={client.id} 
                onClick={() => loadClientDetails(client.id)}
                className="flex items-center p-5 bg-[#141414] rounded-[24px] border border-white/5 hover:bg-white/5 transition-all cursor-pointer group hover:border-white/20 active:scale-[0.99] shadow-sm relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 blur-3xl -mr-12 -mt-12 rounded-full" />
                <div className="w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center mr-5 shrink-0 shadow-lg shadow-orange-500/20 group-hover:scale-110 transition-transform">
                  <User className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-lg tracking-tight truncate">{client.name}</h3>
                    <div className="px-2 py-0.5 rounded-lg bg-orange-500/10 text-orange-400 text-[9px] font-black tracking-widest border border-orange-500/10">
                      ID: {client.id.slice(-4).toUpperCase()}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] font-black text-white/30 tracking-widest">
                    <span>{client.phone}</span>
                    <span className="opacity-50">• {format(new Date(client.created), "dd.MM.yyyy")}</span>
                    {client.daysSinceLastOrder !== Infinity && (
                       <span className={`opacity-80 px-2 py-0.5 rounded font-bold ${client.daysSinceLastOrder > 30 ? 'bg-indigo-500/20 text-indigo-400' : 'bg-green-500/10 text-green-400'}`}>
                         БЫЛ {client.daysSinceLastOrder} ДН. НАЗАД
                       </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end mr-4">
                  <span className="text-[10px] font-black text-white/20 tracking-widest leading-none mb-1">
                    {segmentFilter === 'top' ? 'СРЕДНИЙ ЧЕК' : 'LTV / ЗАК'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black text-white leading-none">
                      {segmentFilter === 'top' ? 
                        <>{client.averageCheck.toFixed(0)} <span className="text-[10px] text-white/40 font-bold ml-[-2px]">₪</span></> : 
                        <>{client.orderCount} <span className="text-[10px] text-white/40 font-bold ml-[-2px]">ЗАК</span></>
                      }
                    </span>
                    <ChevronRight className="w-5 h-5 text-white/10 group-hover:text-orange-500 transition-colors" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && setShowAddModal(false)}>
          <div className="bg-[#1a1a1a] rounded-3xl p-8 w-full max-w-sm border border-white/10 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-bold mb-6 tracking-tight flex items-center gap-3">
              <Plus className="w-5 h-5 text-orange-500" />
              Новый клиент
            </h2>
            <div className="space-y-4">
              <input type="text" placeholder="ИМЯ" value={newName} onChange={e => setNewName(e.target.value)} className="w-full bg-black/40 rounded-xl px-4 py-3 text-sm focus:outline-none border border-white/5" />
              <input type="text" placeholder="ТЕЛЕФОН" value={newPhone} onChange={e => setNewPhone(e.target.value)} className="w-full bg-black/40 rounded-xl px-4 py-3 text-sm focus:outline-none border border-white/5" />
            </div>
            <button onClick={handleAdd} className="w-full mt-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 font-bold text-sm transition-colors text-white tracking-widest shadow-lg shadow-orange-500/20 active:scale-95">
              Сохранить
            </button>
          </div>
        </div>
      )}

      {confirmDeleteId && (
        <ConfirmModal
          title="Удалить клиента?"
          message={`Точно удалить "${confirmDeleteId.name}"? Это снесет и ВСЕ его заказы.`}
          onConfirm={async () => {
            await deleteClient(confirmDeleteId.id);
            setConfirmDeleteId(null);
          }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}

      {showEditModal && clientData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && setShowEditModal(false)}>
          <div className="bg-[#1a1a1a] rounded-3xl p-8 w-full max-w-sm border border-white/10 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-bold mb-6 tracking-tight flex items-center gap-3">
              <User className="w-5 h-5 text-orange-500" />
              Редактировать клиента
            </h2>
            <div className="space-y-4">
              <input type="text" placeholder="ИМЯ" value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-black/40 rounded-xl px-4 py-3 text-sm focus:outline-none border border-white/5" />
              <input type="text" placeholder="ТЕЛЕФОН" value={editPhone} onChange={e => setEditPhone(e.target.value)} className="w-full bg-black/40 rounded-xl px-4 py-3 text-sm focus:outline-none border border-white/5" />
              <input type="text" placeholder="АДРЕС" value={editAddress} onChange={e => setEditAddress(e.target.value)} className="w-full bg-black/40 rounded-xl px-4 py-3 text-sm focus:outline-none border border-white/5" />
            </div>
            <button onClick={async () => {
                await updateClient(clientData.id, { name: editName.trim(), phone: editPhone.trim(), address: editAddress.trim() });
                setClientData({...clientData, name: editName.trim(), phone: editPhone.trim(), address: editAddress.trim()});
                setShowEditModal(false);
            }} className="w-full mt-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 font-bold text-sm transition-colors text-white tracking-widest shadow-lg shadow-orange-500/20 active:scale-95">
              Сохранить
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
