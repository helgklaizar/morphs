"use client";

import { useState, useMemo } from "react";
import { format, isToday } from "date-fns";
import { AnimatePresence } from "framer-motion";
import { 
  Archive, Edit2, Trash2, Clock, FileText, RotateCw, Receipt, Users
} from "lucide-react";
import Link from "next/link";
import { OrderEditModal } from "./components/OrderEditModal";
import { 
  useOrdersStore, 
  useOrdersQuery, 
  useUpdateOrderStatusMutation, 
  useDeleteOrderMutation,
  useArchiveOrderMutation
} from '@rms/core';
import { OrderStatus, Order } from '@rms/core';
import { ConfirmModal } from "@/components/ConfirmModal";
import { KitchenTab } from "./components/KitchenTab";
import { STATUS_CONFIG } from "./config";
import { OrderCard } from "./components/OrderCard";

export default function OrdersPage() {
  // Zustand UI State
  const { viewMode, setViewMode, statusFilter, setStatusFilter } = useOrdersStore();
  
  // React Query Data State
  const { data: orders = [], isLoading, refetch } = useOrdersQuery();
  const updateStatusMutation = useUpdateOrderStatusMutation();
  const deleteMutation = useDeleteOrderMutation();
  const archiveMutation = useArchiveOrderMutation();

  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmDeleteSubscription, setConfirmDeleteSubscription] = useState<{ key: string; orders: Order[] } | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<string | null>(null);

  const handleDeleteSubscription = async () => {
    if (!confirmDeleteSubscription) return;
    for (const order of confirmDeleteSubscription.orders) {
      deleteMutation.mutate(order.id);
    }
    setConfirmDeleteSubscription(null);
  };

  const handleAcceptSubscription = async (profile: { orders: Order[] }) => {
    for (const order of profile.orders) {
      if (order.status === 'pending') {
        updateStatusMutation.mutate({ id: order.id, status: 'new' });
      }
    }
  };

  const filteredOrders = useMemo(() => {
    if (statusFilter === 'weekly_today') {
      return orders.filter(o => o.customerName.includes("Подписка") && isToday(new Date(o.reservationDate || o.createdAt)));
    }
    if (statusFilter !== 'all') {
      return orders.filter(o => o.status === statusFilter);
    }
    return orders;
  }, [orders, statusFilter]);

  const groupedOrders = (Object.keys(STATUS_CONFIG) as OrderStatus[]).reduce((acc, status) => {
    acc[status] = filteredOrders.filter(o => o.status === status);
    return acc;
  }, {} as Record<OrderStatus, Order[]>);

  const subscriptionOrders = orders.filter(o => o.customerName.includes("Подписка"));

  const megaProfiles = useMemo(() => {
    const profiles: Record<string, { phone: string, cleanName: string, orders: Order[], totalSum: number, paymentMethod: string }> = {};
    subscriptionOrders.forEach(o => {
      const match = o.customerName.match(/^(.*?)\s*\(Подписка/i);
      const cleanName = match ? match[1].trim() : o.customerName;
      const key = `${o.customerPhone}-${cleanName}`;
      
      if (!profiles[key]) {
        profiles[key] = { phone: o.customerPhone, cleanName, orders: [], totalSum: 0, paymentMethod: o.paymentMethod };
      }
      profiles[key].orders.push(o);
      profiles[key].totalSum += o.totalAmount;
    });
    return Object.values(profiles);
  }, [subscriptionOrders]);

  return (
    <div className="flex h-full flex-col">
      {/* Header / Tabs */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5 shrink-0">
        <h1 className="text-3xl lg:text-4xl font-black tracking-tighter uppercase bg-gradient-to-r from-white to-white/50 bg-clip-text text-transparent">Лента Заказов</h1>
        <Link 
          href="/orders-history" 
          className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors bg-white/5 px-3 py-1.5 rounded-lg border border-white/5"
        >
          <Receipt className="w-4 h-4" /> История / Архив
        </Link>
      </div>

      {/* View Toggle */}
      <div className="flex bg-[#141414] p-1.5 rounded-xl border border-white/5 shadow-inner mb-6 shrink-0 w-fit">
        <button 
          onClick={() => setViewMode("regular")}
          className={`px-5 py-2 font-bold text-sm transition-all rounded-lg ${viewMode === "regular" ? "bg-orange-500 text-white shadow-md shadow-orange-500/20" : "text-white/40 hover:text-white/80"}`}
        >
          Заказы кухни
        </button>
        <button 
          onClick={() => setViewMode("mega")}
          className={`px-5 py-2 font-bold text-sm transition-all rounded-lg flex items-center gap-2 ${viewMode === "mega" ? "bg-orange-500 text-white shadow-md shadow-orange-500/20" : "text-white/40 hover:text-white/80"}`}
        >
          Мега-профили (Подписки)
          {subscriptionOrders.length > 0 && (
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">{megaProfiles.length}</span>
          )}
        </button>
        <button 
          onClick={() => setViewMode("kitchen")}
          className={`px-5 py-2 font-bold text-sm transition-all rounded-lg ${viewMode === "kitchen" ? "bg-orange-500 text-white shadow-md shadow-orange-500/20" : "text-white/40 hover:text-white/80"}`}
        >
          Лента кухни
        </button>
      </div>

      {viewMode === "kitchen" && <KitchenTab />}

      {/* Filters (only for regular view) */}
      {viewMode === "regular" && (
        <div className="flex flex-wrap gap-2 mb-6 shrink-0">
          <button onClick={() => setStatusFilter('all')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${statusFilter === 'all' ? 'bg-white text-black shadow-lg' : 'bg-[#1a1a1a] text-white/50 hover:bg-[#242424]'}`}>
            Все
          </button>
          <button onClick={() => setStatusFilter('new')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${statusFilter === 'new' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-[#1a1a1a] text-white/50 hover:bg-[#242424]'}`}>
            Новые
          </button>
          <button onClick={() => setStatusFilter('preparing')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${statusFilter === 'preparing' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-[#1a1a1a] text-white/50 hover:bg-[#242424]'}`}>
            Готовятся
          </button>
          <button onClick={() => setStatusFilter('ready')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${statusFilter === 'ready' ? 'bg-[#00C853] text-white shadow-lg shadow-[#00C853]/20' : 'bg-[#1a1a1a] text-white/50 hover:bg-[#242424]'}`}>
            Готовы
          </button>
          <button onClick={() => setStatusFilter('delivering')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${statusFilter === 'delivering' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-[#1a1a1a] text-white/50 hover:bg-[#242424]'}`}>
            У курьера
          </button>
          <button onClick={() => setStatusFilter('weekly_today')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 border border-green-500/30 ${statusFilter === 'weekly_today' ? 'bg-green-500/20 text-green-400 shadow-lg' : 'bg-[#1a1a1a] text-green-500/60 hover:bg-[#242424]'}`}>
            🎯 Подписки на СЕГОДНЯ
          </button>
        </div>
      )}

      <div className={`flex-1 overflow-auto ${viewMode === 'kitchen' ? 'hidden' : ''}`}>
          {isLoading && orders.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin mb-4" />
              <p className="text-xl font-semibold text-gray-500">Загрузка...</p>
            </div>
          ) : viewMode === "regular" ? (
             orders.length === 0 ? (
               <div className="flex h-64 flex-col items-center justify-center">
                 <Receipt className="h-16 w-16 text-[#2A2A2A] mb-4" />
                 <p className="text-xl font-semibold text-gray-500">Обычных заказов пока нет</p>
               </div>
             ) : (
               <div className="pb-20">
                 {(Object.keys(STATUS_CONFIG) as OrderStatus[]).map((status) => {
                   const group = groupedOrders[status];
                   if (group.length === 0) return null;
   
                   const config = STATUS_CONFIG[status];
   
                   return (
                     <div key={status} className="mb-8">
                       <div className="flex items-center gap-3 mb-4">
                         <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_6px_rgba(0,0,0,0.5)]" style={{ backgroundColor: config.hex, boxShadow: `0 0 6px ${config.hex}80` }}></div>
                         <h2 className="text-lg font-bold">{config.label}</h2>
                         <div className="px-2.5 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: `${config.hex}26`, color: config.hex }}>
                           {group.length}
                         </div>
                       </div>
                       <div className="grid grid-cols-[repeat(auto-fill,minmax(450px,1fr))] gap-6">
                         <AnimatePresence>
                           {group.map(order => (
                             <OrderCard 
                               key={order.id} 
                               order={order} 
                               onEdit={() => setEditingOrder(order)} 
                               onArchive={() => setConfirmArchive(order.id)}
                               onDelete={() => setConfirmDelete(order.id)}
                             />
                           ))}
                         </AnimatePresence>
                       </div>
                     </div>
                   );
                 })}
               </div>
             )
          ) : (
            // MEGA ORDERS VIEW
            <div className="grid grid-cols-[repeat(auto-fill,minmax(500px,1fr))] gap-6 pb-20">
              {megaProfiles.map(profile => (
                <div key={profile.phone} className="bg-[#141414] rounded-[18px] border border-green-500/20 shadow-lg flex flex-col overflow-hidden">
                  <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-green-500/5">
                    <div>
                      <h3 className="font-black text-xl text-white uppercase">{profile.cleanName}</h3>
                      <p className="font-mono text-white/50 text-sm mt-1">{profile.phone}</p>
                    </div>
                    <div className="flex items-center gap-4">
                       <div className="text-right">
                          <p className="text-xs text-white/30 uppercase font-black tracking-widest mb-1.5 border-b border-white/5 pb-1 inline-block">Итого за неделю</p>
                          <div className="text-3xl font-black text-green-500 leading-none">
                            {profile.totalSum} ₪
                          </div>
                       </div>
                       
                       <div className="flex flex-col gap-2 border-l border-white/10 pl-4">
                         <button 
                           onClick={() => handleAcceptSubscription({ orders: profile.orders })}
                           className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg text-xs"
                         >
                           Принять в работу
                         </button>
                         <button 
                           onClick={() => setConfirmDeleteSubscription({ key: profile.phone, orders: profile.orders })}
                           className="bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold py-2 px-4 rounded-lg text-xs"
                         >
                           Удалить
                         </button>
                       </div>
                    </div>
                  </div>
                  <div className="p-5 flex-1 flex flex-col gap-4 bg-[#0a0a0a]">
                     <div className="flex items-center gap-2 mb-2">
                       <span className="text-xs font-black uppercase text-white/30 tracking-widest">ДОСТАВКИ ПО ДНЯМ:</span>
                     </div>
                     <div className="flex flex-col gap-3">
                       {profile.orders.map((o, idx) => {
                         const dayMatch = o.customerName.match(/\[(.*?)\]/);
                         const dayInfo = dayMatch ? dayMatch[1] : `Заказ ${idx+1}`;
                         const deliveryInfo = o.customerName.includes("Самовывоз") ? "Самовывоз" : "Доставка";
                         
                         return (
                           <div key={o.id} className="p-3 bg-[#1c1c1e] rounded-xl border border-white/5 flex items-center justify-between gap-4">
                             <div>
                               <p className="font-bold text-white/90 text-sm">{dayInfo} <span className="text-orange-500/60 ml-2 text-xs">({deliveryInfo})</span></p>
                               <p className="text-xs text-white/40 mt-1">{o.items.length} поз., сумма {o.totalAmount} ₪</p>
                             </div>
                             <div className="flex items-center gap-2">
                               <div className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-black text-white/50 border border-white/10">
                                 Статус: {STATUS_CONFIG[o.status]?.label || o.status}
                               </div>
                               <button onClick={() => setEditingOrder(o)} className="p-1.5 rounded-lg bg-white/5 text-white/40 hover:text-white hover:bg-white/10">
                                 <Edit2 className="w-4 h-4" />
                               </button>
                             </div>
                           </div>
                         )
                       })}
                     </div>
                  </div>
                </div>
              ))}
              {megaProfiles.length === 0 && (
                <div className="col-span-full flex h-64 flex-col items-center justify-center">
                  <Users className="h-16 w-16 text-[#2A2A2A] mb-4" />
                  <p className="text-xl font-semibold text-gray-500">Нет активных подписок</p>
                </div>
              )}
            </div>
          )}

          {/* Floating Action Button Alternative (Bottom right fixed) */}
          <button 
            onClick={() => refetch()}
            className={ `fixed bottom-8 right-8 h-12 w-12 rounded-2xl bg-[#1A1A1A] border border-white/10 flex items-center justify-center shadow-lg hover:bg-white/5 transition-colors text-white ${isLoading ? 'animate-pulse' : ''}` }
          >
            <RotateCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        <OrderEditModal 
          isOpen={editingOrder !== null} 
          onClose={() => setEditingOrder(null)} 
          order={editingOrder} 
        />

        {confirmDelete && (
          <ConfirmModal
            title="Удалить заказ?"
            message="Точно удалить этот заказ? Это действие необратимо."
            onConfirm={() => deleteMutation.mutate(confirmDelete)}
            onCancel={() => setConfirmDelete(null)}
          />
        )}

        {confirmDeleteSubscription && (
          <ConfirmModal
            title="Удалить недельную подписку?"
            message={`Будут удалены все связанные под-заказы на сумму ${confirmDeleteSubscription.orders.reduce((sum, o) => sum + o.totalAmount, 0)} ₪. Отменить это действие невозможно.`}
            onConfirm={handleDeleteSubscription}
            onCancel={() => setConfirmDeleteSubscription(null)}
          />
        )}

        {confirmArchive && (
          <ConfirmModal
            title="В архив?"
            message="Завершить заказ и убрать в архив?"
            onConfirm={() => archiveMutation.mutate(confirmArchive)}
            onCancel={() => setConfirmArchive(null)}
          />
        )}
    </div>
  );
}
