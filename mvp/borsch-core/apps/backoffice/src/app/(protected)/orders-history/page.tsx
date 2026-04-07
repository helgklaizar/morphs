"use client";

import { useEffect, useState } from "react";
import { pb } from "@/lib/pb";
import { ArrowLeft, RefreshCw, Receipt } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

export default function OrdersHistoryPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const result = await pb.collection('orders').getList(1, 100, {
        filter: 'is_archived=1 || status="completed" || status="cancelled"',
        sort: '-created',
      });
      
      const orderIds = result.items.map(r => r.id);
      let orderItems: any[] = [];
      if (orderIds.length > 0) {
        const chunks = [];
        for (let i = 0; i < orderIds.length; i += 40) {
           const chunk = orderIds.slice(i, i+40).map(id => `order_id='${id}'`).join(' || ');
           if (chunk) {
               chunks.push(pb.collection('order_items').getFullList({ filter: chunk }));
           }
        }
        const results = await Promise.all(chunks);
        orderItems = results.flat();
      }

      const formatted = result.items.map(o => ({
         ...o,
         historyItems: orderItems.filter(i => i.order_id === o.id)
      }));

      setOrders(formatted);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 pb-4 border-b border-white/10 mb-5 shrink-0 mt-4">
        <Link href="/orders" className="p-2 rounded-full hover:bg-white/5 transition-colors">
          <ArrowLeft className="w-6 h-6 text-white/50" />
        </Link>
        <h1 className="text-3xl lg:text-4xl font-black tracking-tighter uppercase bg-gradient-to-r from-white to-white/50 bg-clip-text text-transparent">Архив</h1>
        
        <button onClick={fetchHistory} className="ml-auto flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Обновить
        </button>
      </div>

      <div className="flex-1 overflow-auto pb-10">
        {loading ? (
          <div className="flex justify-center items-center h-64">
             <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin mb-4" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-white/40">
            <Receipt className="h-16 w-16 mb-4 opacity-50" />
            <p>Нет архивированных заказов</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
             {orders.map(order => (
               <div key={order.id} className="bg-[#141414] border border-white/5 hover:border-white/20 transition-colors rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden group">
                 {order.status === 'cancelled' && (
                    <div className="absolute top-2 right-2 text-[10px] bg-red-500/20 text-red-500 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Отменен</div>
                 )}
                 <div className="flex justify-between items-start mt-2">
                    <span className="font-bold pr-14 text-white line-clamp-1">{order.customer_name || 'Без имени'}</span>
                    <span className="font-black text-white">{order.total_amount} ₪</span>
                 </div>
                 <div className="text-sm text-neutral-400">{order.customer_phone || 'Нет телефона'}</div>
                 
                 {order.historyItems && order.historyItems.length > 0 && (
                   <div className="mt-2 bg-black/40 rounded-lg p-2 text-xs space-y-1 max-h-32 overflow-y-auto custom-scrollbar border border-white/5">
                     {order.historyItems.map((item: any, i: number) => (
                       <div key={i} className="flex justify-between items-start">
                         <span className="text-white/70 truncate mr-2">{item.menu_item_name}</span>
                         <span className="text-white/40 font-mono flex-shrink-0">x{item.quantity}</span>
                       </div>
                     ))}
                   </div>
                 )}

                 <div className="flexItems-center justify-between mt-3 border-t border-white/5 pt-3">
                    <div className="text-xs text-white/30 uppercase tracking-widest font-mono">
                        {format(new Date(order.created), 'dd MMM yyyy, HH:mm', { locale: ru })}
                    </div>
                    {order.payment_method === 'bit' && <span className="text-[10px] text-purple-400 font-bold border border-purple-500/30 px-1 rounded">BIT</span>}
                 </div>
               </div>
             ))}
          </div>
        )}
      </div>
    </div>
  );
}
