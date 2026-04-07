"use client";

import { useEffect, useState } from "react";
import { pb } from "@/lib/pb";
import { ArrowLeft, RefreshCw, Receipt, ListOrdered, Users, Activity } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

import { OrderCard } from "@/app/(protected)/orders/components/OrderCard";

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
         id: o.id,
         customerName: o.customer_name || '',
         customerPhone: o.customer_phone || '',
         customerAddress: o.customer_address || '',
         totalAmount: o.total_amount || 0,
         status: o.status || 'completed',
         paymentMethod: o.payment_method || 'cash',
         createdAt: o.created,
         reservationDate: o.reservation_date || '',
         items: orderItems.filter(i => i.order_id === o.id).map(i => ({
             id: i.id,
             menuItemId: i.menu_item_id,
             menuItemName: i.menu_item_name,
             quantity: i.quantity,
             price: i.price
         }))
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
      {/* Header / Tabs */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5 shrink-0 gap-4 flex-wrap mt-0">
        <div className="flex items-center gap-6">
          <h1 className="text-3xl lg:text-4xl font-black tracking-tighter uppercase bg-gradient-to-r from-white to-white/50 bg-clip-text text-transparent">Заказы</h1>
          
          <div className="hidden md:flex flex-wrap items-center gap-2 shrink-0">
            <Link 
              href="/orders"
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[11px] md:text-[13px] font-bold uppercase tracking-wider transition-all border border-transparent text-white/40 hover:text-white/80 hover:bg-white/5 bg-transparent"
            >
              <ListOrdered className="w-4 h-4 shrink-0" />
              Разовые
            </Link>
            <Link 
              href="/orders"
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[11px] md:text-[13px] font-bold uppercase tracking-wider transition-all border border-transparent text-white/40 hover:text-white/80 hover:bg-white/5 bg-transparent"
            >
              <Users className="w-4 h-4 shrink-0" />
              Недельные
            </Link>
            <Link 
              href="/orders"
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[11px] md:text-[13px] font-bold uppercase tracking-wider transition-all border border-transparent text-white/40 hover:text-white/80 hover:bg-white/5 bg-transparent"
            >
              <Activity className="w-4 h-4 shrink-0" />
              Кухня
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] md:text-[13px] font-bold uppercase tracking-wider transition-all border bg-white/10 text-white shadow-lg border-white/10 shrink-0">
            <Receipt className="w-4 h-4 shrink-0" /> <span className="hidden md:inline">Архив</span>
          </div>
          <Link 
            href="/orders"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] md:text-[13px] font-bold uppercase tracking-wider transition-all border border-transparent text-white/40 hover:text-white/80 hover:bg-white/5 bg-transparent shrink-0"
          >
            <Users className="w-4 h-4 shrink-0" /> <span className="hidden md:inline">Клиенты</span>
          </Link>
          <button onClick={fetchHistory} className="ml-2 flex items-center gap-2 text-[11px] md:text-[13px] font-bold uppercase tracking-wider text-neutral-400 hover:text-white transition-colors bg-white/5 px-3 py-2 rounded-xl border border-white/5">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
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
          <div className="grid grid-cols-[repeat(auto-fill,minmax(450px,1fr))] gap-6 pb-20">
             {orders.map(order => (
               <div key={order.id} className="h-full">
                 <OrderCard 
                   order={order}
                   onEdit={() => {}}
                   onArchive={() => {}}
                   onDelete={() => {}}
                 />
               </div>
             ))}
          </div>
        )}
      </div>
    </div>
  );
}
