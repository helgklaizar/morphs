

import { useState, useMemo } from "react";
import { format, isToday } from "date-fns";
import { AnimatePresence } from "framer-motion";
import { 
  Archive, Edit2, Trash2, Clock, FileText, RotateCw, Receipt, Users, ListOrdered, Activity
} from "lucide-react";
import { Link } from "react-router-dom";
import { OrderEditModal } from "./components/OrderEditModal";
import { 
  useOrdersStore, 
  useOrdersQuery, 
  useUpdateOrderStatusMutation, 
  useDeleteOrderMutation,
  useArchiveOrderMutation
} from '@rms/core';
import type { OrderStatus, Order } from '@rms/core';
import { ConfirmModal } from "@/components/ConfirmModal";
import { KitchenTab } from "./components/KitchenTab";
import { ClientsTab } from "./components/ClientsTab";
import { STATUS_CONFIG } from "./config";
import { OrderCard } from "./components/OrderCard";
import { useDerivedOrders } from "./hooks/useDerivedOrders";
import { MegaOrdersView } from "./components/MegaOrdersView";

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

  const { subscriptionOrders, targetMegaProfiles: megaProfiles } = useDerivedOrders(orders);

  return (
    <div className="flex h-full flex-col">
      {/* Header / Tabs */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5 shrink-0 gap-4 flex-wrap">
        <div className="flex items-center gap-6">
          <h1 className="text-3xl lg:text-4xl font-black tracking-tighter uppercase bg-gradient-to-r from-white to-white/50 bg-clip-text text-transparent">Заказы</h1>
          
          {/* View Toggle */}
          <div className="hidden md:flex flex-wrap items-center gap-2 shrink-0">
            <button 
              onClick={() => setViewMode("regular")}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[11px] md:text-[13px] font-bold uppercase tracking-wider transition-all border ${viewMode === "regular" ? "bg-white/10 text-white shadow-lg border-white/10" : "border-transparent text-white/40 hover:text-white/80 hover:bg-white/5 bg-transparent"}`}
            >
              <ListOrdered className="w-4 h-4 shrink-0" />
              Разовые
            </button>
            <button 
              onClick={() => setViewMode("mega")}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[11px] md:text-[13px] font-bold uppercase tracking-wider transition-all border ${viewMode === "mega" ? "bg-white/10 text-white shadow-lg border-white/10" : "border-transparent text-white/40 hover:text-white/80 hover:bg-white/5 bg-transparent"}`}
            >
              <Users className="w-4 h-4 shrink-0" />
              Недельные
              {subscriptionOrders.length > 0 && (
                <span className="bg-white/20 px-1.5 py-0.5 rounded text-[9px] font-black">{megaProfiles.length}</span>
              )}
            </button>

            <button 
              onClick={() => setViewMode("kitchen")}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[11px] md:text-[13px] font-bold uppercase tracking-wider transition-all border ${viewMode === "kitchen" ? "bg-white/10 text-white shadow-lg border-white/10" : "border-transparent text-white/40 hover:text-white/80 hover:bg-white/5 bg-transparent"}`}
            >
              <Activity className="w-4 h-4 shrink-0" />
              Кухня
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link 
            to="/orders-history" 
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] md:text-[13px] font-bold uppercase tracking-wider transition-all border border-transparent text-white/40 hover:text-white/80 hover:bg-white/5 bg-transparent shrink-0"
          >
            <Receipt className="w-4 h-4 shrink-0" /> <span className="hidden md:inline">Архив</span>
          </Link>
          <button 
            onClick={() => setViewMode("clients")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] md:text-[13px] font-bold uppercase tracking-wider transition-all border ${viewMode === "clients" ? "bg-white/10 text-white shadow-lg border-white/10" : "border-transparent text-white/40 hover:text-white/80 hover:bg-white/5 bg-transparent shrink-0"}`}
          >
            <Users className="w-4 h-4 shrink-0" /> <span className="hidden md:inline">Клиенты</span>
          </button>
        </div>
      </div>

      {viewMode === "kitchen" && <KitchenTab />}
      {viewMode === "clients" && <ClientsTab />}

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
            <MegaOrdersView 
              megaProfiles={megaProfiles} 
              onAcceptSubscription={handleAcceptSubscription}
              onDeleteSubscription={setConfirmDeleteSubscription}
              onEditOrder={setEditingOrder}
            />
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
