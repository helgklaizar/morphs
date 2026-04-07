"use client";

import { format } from "date-fns";
import { Archive, Edit2, Trash2, Clock, FileText, ChevronRight, CheckCircle2 } from "lucide-react";
import { useOrdersStore, Order, OrderStatus } from '@rms/core';
import { PDFGenerator } from "@/lib/pdf";
import { STATUS_CONFIG } from "../config";
import { motion } from "framer-motion";

export function OrderCard({ order, onEdit, onArchive, onDelete }: { order: Order; onEdit: () => void; onArchive: () => void; onDelete: () => void }) {
  const c = STATUS_CONFIG[order.status] || { hex: '#888', label: 'Неизвестно' };
  
  const safeFormat = (dateStr: string | undefined, fmt: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr.replace(' ', 'T'));
    if (isNaN(d.getTime())) return '—';
    return format(d, fmt);
  };

  const dateStr = safeFormat(order.reservationDate || order.createdAt, "dd.MM HH:mm");
  const pickupStr = safeFormat(order.reservationDate, "dd.MM HH:mm");
  
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

  const updateStatus = (newStatus: OrderStatus) => {
     useOrdersStore.getState().updateOrderStatus(order.id, newStatus);
  };

  return (
    <motion.div 
      layout 
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="flex flex-col bg-white/5 backdrop-blur-2xl rounded-[24px] border border-white/10 h-full shadow-2xl group hover:border-white/20 transition-all overflow-hidden relative"
      style={{ boxShadow: `0 8px 32px -8px ${c.hex}25` }}
    >
      {/* Glow Effect Top Border */}
      <div className="absolute top-0 left-0 right-0 h-[2px] w-full" style={{ background: `linear-gradient(90deg, transparent, ${c.hex}, transparent)` }}></div>

      {/* NEW HEADER: Name, Phone, Payment Type */}
      <div className="flex flex-col px-5 py-5 border-b border-white/5 relative bg-black/20">
        <div className="flex justify-between items-start gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="font-black text-3xl text-white truncate leading-none mb-2.5 tracking-tight">
              {cleanName}
            </h3>
            <p className="text-sm font-bold text-white/50 tracking-widest font-mono">{order.customerPhone || 'НЕТ НОМЕРА'}</p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className={`px-3 py-1.5 rounded-xl font-black text-[11px] uppercase tracking-widest border transition-colors shrink-0 flex items-center gap-1.5 ${
              order.paymentMethod === 'bit' 
                ? 'bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.1)]' 
                : 'bg-green-500/10 text-green-400 border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]'
            }`}>
              {order.paymentMethod === 'bit' ? '💳 BIT' : '💵 КЭШ'}
            </div>
            
            {/* Actions on hover */}
            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
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
        </div>
      </div>

      <div className="flex flex-col flex-1 p-5">
        
        {/* Main block: items list */}
        <div className="flex-1 space-y-3 mb-6 bg-black/20 rounded-2xl p-4 border border-white/5 custom-scrollbar overflow-y-auto max-h-[180px]">
          <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2">Позиции ({order.items.length})</p>
          {order.items.map(it => (
            <div key={it.id} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center font-black text-orange-500/90 text-sm border border-white/10">
                {it.quantity}
              </div>
              <span className="font-bold text-white/90 line-clamp-2 text-base leading-snug">{it.menuItemName}</span>
            </div>
          ))}
        </div>

        {/* Address, Date, Time, Price block */}
        <div className="flex justify-between items-end pb-1">
          <div className="flex flex-col gap-2 min-w-0 pr-2">
            <div className={`flex items-center gap-1.5 w-fit px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-widest leading-none border ${isDelivery ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'}`}>
              <Clock className="w-4 h-4" />
              <span>{deliveryTypeLabel}</span>
            </div>
            <span className="text-lg font-black text-white/90 leading-none mt-1">{pickupStr}</span>
            {isDelivery && addressStr && (
               <span className="text-[13px] font-bold text-white/50 mt-1 truncate max-w-[220px]" title={addressStr}>
                 📍 {addressStr}
               </span>
            )}
          </div>
          
          <div className="flex flex-col items-end shrink-0">
             {isSubscription ? (
                 <span className="text-2xl font-black text-green-500 leading-none tracking-tighter uppercase relative">
                   ОПЛЧ.
                 </span>
             ) : (
                 <span className="text-[36px] font-black text-white leading-none tracking-tighter">
                    {order.totalAmount} <span className="text-orange-500 text-2xl font-bold ml-1">₪</span>
                 </span>
             )}
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="mt-5 pt-5 border-t border-white/5 flex gap-2 h-14">
            <div className="relative shrink-0 w-14 h-full">
                 <select 
                   className="w-full h-full absolute inset-0 opacity-0 cursor-pointer z-10"
                   value={order.status}
                   onChange={(e) => updateStatus(e.target.value as OrderStatus)}
                 >
                   {Object.entries(STATUS_CONFIG).map(([val, conf]) => (
                     <option key={val} value={val} className="bg-[#1C1C1C] text-white">
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
                 <button onClick={() => updateStatus('preparing')} className="w-full h-full rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-black uppercase text-sm tracking-widest flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                    Начать готовить <ChevronRight className="w-5 h-5" />
                 </button>
              )}
              {order.status === 'preparing' && (
                 <button onClick={() => updateStatus('ready')} className="w-full h-full rounded-xl bg-[#00C853] hover:bg-[#00E676] text-green-950 font-black uppercase text-sm tracking-widest flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(0,200,83,0.3)]">
                    Отметить готовым <CheckCircle2 className="w-5 h-5" />
                 </button>
              )}
              {order.status === 'ready' && isDelivery && (
                 <button onClick={() => updateStatus('delivering')} className="w-full h-full rounded-xl bg-blue-500 hover:bg-blue-400 text-blue-950 font-black uppercase text-sm tracking-widest flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                    Передать курьеpу <ChevronRight className="w-5 h-5" />
                 </button>
              )}
              {order.status === 'ready' && !isDelivery && (
                 <button onClick={onArchive} className="w-full h-full rounded-xl bg-white/10 hover:bg-white/20 text-white font-black uppercase text-sm tracking-widest flex items-center justify-center gap-2 transition-all">
                    Выдать <Archive className="w-5 h-5" />
                 </button>
              )}
              {(order.status === 'delivering' || order.status === 'completed' || order.status === 'cancelled' || order.status === 'pending') && (
                 <div className="w-full h-full rounded-xl bg-white/5 border border-white/5 text-white/30 font-black uppercase text-sm tracking-widest flex items-center justify-center text-center">
                    {order.status === 'completed' ? 'Завершен' : order.status === 'delivering' ? 'У курьера' : order.status === 'cancelled' ? 'Отменен' : 'Ожидает'}
                 </div>
              )}
            </div>
        </div>
      </div>
    </motion.div>
  );
}

