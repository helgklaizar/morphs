"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { 
  Archive, 
  Edit2, 
  Trash2, 
  Clock, 
  RotateCw,
  Receipt,
  Users
} from "lucide-react";
import Link from "next/link";
import { OrderEditModal } from "./components/OrderEditModal";
import { useOrdersStore, OrderStatus, Order } from "@/store/useOrdersStore";
import { ConfirmModal } from "@/components/ConfirmModal";

const STATUS_CONFIG: Record<OrderStatus, { label: string, colorClass: string, hex: string }> = {
  new: { label: 'Новый', colorClass: 'text-orange-500 bg-orange-500', hex: '#FF6B00' },
  preparing: { label: 'Готовится', colorClass: 'text-amber-500 bg-amber-500', hex: '#FFC107' },
  ready: { label: 'Готов', colorClass: 'text-[#00C853] bg-[#00C853]', hex: '#00C853' },
  delivering: { label: 'У курьера', colorClass: 'text-blue-500 bg-blue-500', hex: '#3B82F6' },
  completed: { label: 'Выполнен', colorClass: 'text-gray-500 bg-gray-500', hex: '#6B7280' },
  cancelled: { label: 'Отменён', colorClass: 'text-red-500 bg-red-500', hex: '#EF4444' },
};

export default function OrdersPage() {
  const { orders, isLoading, fetchOrders, subscribeToOrders, unsubscribeFromOrders } = useOrdersStore();
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
    subscribeToOrders();
    return () => unsubscribeFromOrders();
  }, [fetchOrders, subscribeToOrders, unsubscribeFromOrders]);

  // Group orders by status
  const groupedOrders = (Object.keys(STATUS_CONFIG) as OrderStatus[]).reduce((acc, status) => {
    acc[status] = orders.filter(o => o.status === status);
    return acc;
  }, {} as Record<OrderStatus, Order[]>);

  return (
    <div className="flex h-full flex-col">
      {/* Header / Tabs */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Управление</h1>
      </div>

      <div className="flex-1 overflow-auto">
          {isLoading && orders.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin mb-4" />
              <p className="text-xl font-semibold text-gray-500">Загрузка...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center">
              <Receipt className="h-16 w-16 text-[#2A2A2A] mb-4" />
              <p className="text-xl font-semibold text-gray-500">Заказов пока нет</p>
              <p className="text-sm text-gray-600">Новые заказы появятся здесь</p>
            </div>
          ) : (
            <div className="pb-20">
              {(Object.keys(STATUS_CONFIG) as OrderStatus[]).map((status) => {
                const group = groupedOrders[status];
                if (group.length === 0) return null;

                const config = STATUS_CONFIG[status];

                return (
                  <div key={status} className="mb-8">
                    {/* Status Header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_6px_rgba(0,0,0,0.5)]" style={{ backgroundColor: config.hex, boxShadow: `0 0 6px ${config.hex}80` }}></div>
                      <h2 className="text-lg font-bold">{config.label}</h2>
                      <div className="px-2.5 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: `${config.hex}26`, color: config.hex }}>
                        {group.length}
                      </div>
                    </div>

                    {/* Order Grid */}
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(450px,1fr))] gap-6">
                      {group.map(order => (
                        <OrderCard 
                          key={order.id} 
                          order={order} 
                          onEdit={() => setEditingOrder(order)} 
                          onArchive={() => setConfirmArchive(order.id)}
                          onDelete={() => setConfirmDelete(order.id)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Floating Action Button Alternative (Bottom right fixed) */}
          <button 
            onClick={() => fetchOrders()}
            className="fixed bottom-8 right-8 h-12 w-12 rounded-2xl bg-[#1A1A1A] border border-white/10 flex items-center justify-center shadow-lg hover:bg-white/5 transition-colors text-white"
          >
            <RotateCw className="w-5 h-5" />
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
            onConfirm={() => useOrdersStore.getState().deleteOrder(confirmDelete)}
            onCancel={() => setConfirmDelete(null)}
          />
        )}

        {confirmArchive && (
          <ConfirmModal
            title="В архив?"
            message="Завершить заказ и убрать в архив?"
            onConfirm={() => useOrdersStore.getState().archiveOrder(confirmArchive)}
            onCancel={() => setConfirmArchive(null)}
          />
        )}
    </div>
  );
}

function OrderCard({ order, onEdit, onArchive, onDelete }: { order: Order; onEdit: () => void; onArchive: () => void; onDelete: () => void }) {
  const c = STATUS_CONFIG[order.status];
  const dateStr = format(new Date(order.reservationDate || order.createdAt), "dd.MM HH:mm");
  const pickupStr = order.reservationDate ? format(new Date(order.reservationDate), "dd.MM HH:mm") : '—';

  return (
    <div className="flex flex-col bg-[#141414] rounded-[18px] border h-full" style={{ borderColor: `${c.hex}38` }}>
      {/* Header Stripe */}
      <div className="flex items-center px-4 py-3 rounded-t-[17px] gap-2 overflow-hidden" style={{ backgroundColor: `${c.hex}14` }}>
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.hex, boxShadow: `0 0 4px ${c.hex}99` }}></div>
        <span className="text-sm font-bold shrink-0" style={{ color: c.hex }}>{c.label}</span>
        
        <div className="flex-1 min-w-0" /> {/* Spacer */}

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-white/50 hidden sm:inline-block">{order.reservationDate ? `📅 ${dateStr}` : dateStr}</span>
          <button 
            onClick={onArchive}
            className="text-amber-500 hover:text-amber-400 transition-colors"
          >
            <Archive className="w-[18px] h-[18px]" />
          </button>
            <button onClick={onEdit} className="text-white/60 hover:text-white transition-colors">
              <Edit2 className="w-[18px] h-[18px]" />
            </button>
            <button 
              onClick={onDelete}
              className="text-red-500 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-4 pt-3.5">
        {/* Customer Info */}
        <div className="mb-3 border-b border-white/5 pb-3">
          <h3 className="font-bold text-lg text-white break-words leading-tight">{order.customerName}</h3>
          <div className="flex items-center mt-2 gap-3 flex-wrap">
            <span className="text-sm font-medium text-white/60">{order.customerPhone || '—'}</span>
            <span className="px-2 py-1 rounded bg-white/10 text-xs text-amber-500 font-bold border border-amber-500/20">
              {order.paymentMethod === 'bit' ? '💳 Bit' : '💵 Наличные'}
            </span>
          </div>
        </div>

        {/* Items List */}
        <div className="flex-1 space-y-2 mb-4">
          {order.items.map(it => (
            <div key={it.id} className="flex items-start text-[14px] leading-snug">
              <span className="font-bold text-orange-500 mr-2 shrink-0">{it.quantity}x</span>
              <span className="text-white break-words">{it.menuItemName}</span>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center gap-1.5 text-white/40">
            <Clock className="w-[11px] h-[11px]" />
            <span className="text-[11px]">{pickupStr}</span>
          </div>
          <span className="font-extrabold text-lg text-orange-500">{order.totalAmount} ₪</span>
        </div>
      </div>

      {/* Status Dropdown */}
      <div className="mx-3 mb-3 mt-1 relative">
        <select 
          className="w-full appearance-none bg-white/5 border border-white/10 rounded-[10px] py-1.5 px-3 text-[13px] font-medium text-white outline-none focus:border-white/20 transition-colors"
          value={order.status}
          onChange={(e) => useOrdersStore.getState().updateOrderStatus(order.id, e.target.value as OrderStatus)}
        >
          {Object.entries(STATUS_CONFIG).map(([val, conf]) => (
            <option key={val} value={val} className="bg-[#1C1C1C] text-white py-2">
              {conf.label}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: c.hex }}>
          ▼
        </div>
      </div>
    </div>
  );
}
