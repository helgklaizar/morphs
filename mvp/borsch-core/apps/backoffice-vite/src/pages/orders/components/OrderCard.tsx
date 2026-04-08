"use client";

import { format } from "date-fns";
import { Archive, Edit2, Trash2, Clock, FileText, ChevronRight, CheckCircle2 } from "lucide-react";
import { useUpdateOrderStatusMutation } from '@rms/core';
import type { Order, OrderStatus } from '@rms/core';
import { STATUS_CONFIG } from "../config";

export function OrderCard({ order, onEdit, onArchive, onDelete }: { order: Order; onEdit: () => void; onArchive: () => void; onDelete: () => void }) {
  const c = STATUS_CONFIG[order.status] || { hex: '#888', label: 'Неизвестно' };
  
  const safeFormat = (dateStr: string | undefined, fmt: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr.replace(' ', 'T'));
    if (isNaN(d.getTime())) return '—';
    return format(d, fmt);
  };

  const dateStr = safeFormat(order.reservationDate || order.createdAt, "dd.MM");
  const timeStr = safeFormat(order.reservationDate || order.createdAt, "HH:mm");
  
  const isSubscription = order.customerName.includes("Подписка");
  const isDelivery = order.customerName.toLowerCase().includes("доставка") || !isSubscription; 
  let deliveryTypeLabel = "Доставка";
  if (order.customerName.toLowerCase().includes("самовывоз")) {
    deliveryTypeLabel = "Самовывоз";
  }

  let cleanName = order.customerName.replace(/\s*\((Самовывоз|Доставка.*?)\)/i, '');
  
  let addressStr = "";
  if (isDelivery) {
    const addressMatch = order.customerName.match(/Доставка:\s*(.*?)\)/i);
    if (addressMatch) addressStr = addressMatch[1].trim();
  }

  let subDayInfo = "";
  if (isSubscription) {
    const match = cleanName.match(/^(.*?)\s*\(Подписка/i);
    if (match) cleanName = match[1].trim();
    const dayMatch = order.customerName.match(/\[(.*?)\]/);
    if (dayMatch) subDayInfo = dayMatch[1];
  }

  const updateStatusMutation = useUpdateOrderStatusMutation();

  const updateStatus = (newStatus: OrderStatus) => {
     updateStatusMutation.mutate({ id: order.id, status: newStatus });
  };

  return (
    <div 

      className="flex flex-col bg-[#141414] rounded-2xl border border-white/10 h-full shadow-2xl transition-all overflow-hidden relative"
      style={{ boxShadow: `0 8px 32px -8px ${c.hex}25` }}
    >
      {/* Glow Effect Top Border */}
      <div className="absolute top-0 left-0 right-0 h-[3px] w-full" style={{ backgroundColor: c.hex }}></div>

      <div className="flex flex-col p-4 flex-1 gap-4">
        {/* БЛОК 1: Имя - телефон - тип оплаты - кнопки (в одну строку) */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/5">
          <div className="flex items-center gap-3 min-w-0 flex-wrap text-[18px] font-medium text-white/90">
            <h3 className="text-[21px] font-bold truncate shrink-0">{cleanName}</h3>
            <span className="whitespace-nowrap shrink-0">{order.customerPhone || 'НЕТ НОМЕРА'}</span>
            <div className={`px-2.5 py-0.5 rounded text-[16px] font-bold shrink-0 ${
              order.paymentMethod === 'bit' 
                ? 'bg-purple-500/20 text-purple-300' 
                : 'bg-green-500/20 text-green-300'
            }`}>
              {order.paymentMethod === 'bit' ? '💳 BIT' : '💵 КЭШ'}
            </div>
            <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[16px] font-bold shrink-0 ${
              isDelivery ? 'bg-blue-500/10 text-blue-400' : 'bg-orange-500/10 text-orange-400'
            }`}>
              <Clock className="w-5 h-5" />
              <span>{deliveryTypeLabel}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={onEdit} className="p-1.5 rounded-lg bg-white/5 text-white/40 hover:text-white hover:bg-white/10" title="Редактировать">
              <Edit2 className="w-4 h-4" />
            </button>
            <button onClick={onArchive} className="p-1.5 rounded-lg bg-white/5 text-amber-500/70 hover:text-amber-500 hover:bg-amber-500/10" title="В архив">
              <Archive className="w-4 h-4" />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded-lg bg-white/5 text-red-500/40 hover:text-red-500 hover:bg-red-500/10" title="Удалить">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* БЛОК 2: Позиции заказа (название порции и количество) */}
        <div className="flex flex-col gap-1.5 flex-1 mt-2">
          {order.items.map(it => (
            <div key={it.id} className="flex items-start justify-between gap-3 text-[18px] font-medium text-white/90">
              <span className="leading-tight">{it.menuItemName}</span>
              <span className="whitespace-nowrap font-bold">
                × {it.quantity}
              </span>
            </div>
          ))}
        </div>

        {/* БЛОК 3: самовывоз/доставка (адрес), дата, время, цена */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/5 shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1 text-[17px] font-medium text-white/90">
            <div className="flex items-center gap-2 bg-white/10 px-2.5 py-0.5 rounded-lg shrink-0">
              <span className="text-[18px] font-bold text-white/80">{dateStr}</span>
              <span className="text-[19px] font-bold text-white">{timeStr}</span>
            </div>
            
            {isDelivery && addressStr && (
              <span className="truncate flex-1 min-w-0 leading-tight" title={addressStr}>📍 {addressStr}</span>
            )}
          </div>

          <div className="shrink-0 flex items-center justify-end pl-3">
            {isSubscription ? (
              <span className="text-[19px] font-bold text-green-500">Оплачено</span>
            ) : (
              <span className="text-[21px] font-bold text-orange-500">
                {order.totalAmount} ₪
              </span>
            )}
          </div>
        </div>

        {/* БЛОК 4: Экшены (Статусы) */}
        <div className="flex gap-2 h-12 mt-1 shrink-0">
          <div className="relative shrink-0 w-12 h-full">
               <select 
                 className="w-full h-full absolute inset-0 opacity-0 cursor-pointer z-10"
                 value={order.status}
                 onChange={(e) => updateStatus(e.target.value as OrderStatus)}
               >
                 {Object.entries(STATUS_CONFIG).map(([val, conf]) => (
                   <option key={val} value={val} className="bg-[#1C1C1C] text-white flex gap-2">
                     {conf.label}
                   </option>
                 ))}
               </select>
               <div className="w-full h-full bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-white/30 group-hover:bg-white/10 group-hover:text-white/60 transition-colors" title="Изменить статус вручную">
                 •••
               </div>
          </div>
          
          <div className="flex-1 h-full">
            {order.status === 'new' && (
               <button onClick={() => updateStatus('preparing')} className="w-full h-full rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-medium text-base flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                  Начать готовить <ChevronRight className="w-4 h-4" />
               </button>
            )}
            {order.status === 'preparing' && (
               <button onClick={() => updateStatus('ready')} className="w-full h-full rounded-xl bg-[#00C853] hover:bg-[#00E676] text-green-950 font-medium text-base flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(0,200,83,0.3)]">
                  Готово <CheckCircle2 className="w-4 h-4" />
               </button>
            )}
            {order.status === 'ready' && isDelivery && (
               <button onClick={() => updateStatus('delivering')} className="w-full h-full rounded-xl bg-blue-500 hover:bg-blue-400 text-blue-950 font-medium text-base flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                  Передать курьеру <ChevronRight className="w-4 h-4" />
               </button>
            )}
            {order.status === 'ready' && !isDelivery && (
               <button onClick={onArchive} className="w-full h-full rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-base flex items-center justify-center gap-2 transition-all">
                  Выдать <Archive className="w-4 h-4" />
               </button>
            )}
            {(order.status === 'delivering' || order.status === 'completed' || order.status === 'cancelled' || order.status === 'pending') && (
               <div className={`w-full h-full rounded-xl font-medium text-base flex items-center justify-center text-center ${
                 order.status === 'completed' ? 'bg-green-500/10 text-green-500' : 
                 order.status === 'delivering' ? 'bg-blue-500/10 text-blue-500' : 
                 order.status === 'cancelled' ? 'bg-red-500/10 text-red-500' : 
                 'bg-white/5 text-white/50'
               }`}>
                  {order.status === 'completed' ? 'Завершен' : order.status === 'delivering' ? 'Выдан курьеру' : order.status === 'cancelled' ? 'Отменен' : 'Ожидает'}
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

