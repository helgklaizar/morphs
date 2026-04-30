"use client";

import { useEffect } from "react";
import { format } from "date-fns";
import { 
  History, 
  Calendar, 
  UserCircle, 
  ShoppingBag, 
  ArrowLeft,
  CreditCard,
  Hash
} from "lucide-react";
import Link from "next/link";
import { useHistoryStore } from "@/store/useHistoryStore";

export default function OrdersHistoryPage() {
  const { history, isLoading, fetchHistory } = useHistoryStore();

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6 flex-shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/orders" className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
            <ArrowLeft className="w-5 h-5 text-white/40" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">История заказов</h1>
            <p className="text-sm text-muted-foreground mt-1 uppercase text-[10px] font-black tracking-widest opacity-50">Архив завершенных и отмененных заказов</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-20 custom-scrollbar pr-2">
        {isLoading && history.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center w-full">
            <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin mb-4" />
            <p className="text-xl font-semibold text-gray-500">Загрузка архива...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 border border-dashed border-white/5 rounded-3xl">
            <History className="h-16 w-16 text-[#2A2A2A] mb-4" />
            <p className="text-xl font-bold text-white/20 uppercase tracking-tighter">Архив пуст</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {history.map(order => (
              <div key={order.id} className="bg-[#141414] border border-white/5 rounded-2xl p-5 flex flex-col gap-4 shadow-sm hover:border-white/10 transition-all group">
                <div className="flex items-start justify-between border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                      <UserCircle className="h-6 w-6 text-orange-500" />
                    </div>
                    <div>
                      <h3 className="font-black text-lg leading-none uppercase tracking-tight">{order.customerName || 'Гость'}</h3>
                      <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-1">{order.customerPhone || 'Без телефона'}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1 text-[10px] font-black text-white/20 uppercase bg-white/5 px-2 py-1 rounded-lg">
                       <Hash className="w-3 h-3" />
                       {order.id.slice(-5).toUpperCase()}
                    </div>
                    <div className={`mt-2 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                      order.status === 'cancelled' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                    }`}>
                      {order.status === 'cancelled' ? 'Отменен' : 'Завершен'}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">Состав заказа</p>
                  <div className="grid grid-cols-1 gap-1.5 font-bold">
                    {order.items.map((it: any) => (
                      <div key={it.id} className="flex items-center justify-between text-xs bg-white/2 p-2 rounded-xl">
                        <div className="flex items-center gap-2">
                          <span className="text-orange-500 font-black">{it.quantity}x</span>
                          <span className="text-white/70 line-clamp-1">{it.menuItemName}</span>
                        </div>
                        <span className="text-white/20 font-mono text-[10px]">{it.priceAtTime * it.quantity} ₪</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-auto pt-4 flex items-center justify-between border-t border-white/5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] text-white/30 font-bold uppercase tracking-wider">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(order.createdAt), "dd.MM.yyyy HH:mm")}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-white/20 font-bold uppercase tracking-wider">
                      <CreditCard className="w-3 h-3" />
                       Оплата: {order.paymentMethod === 'bit' ? '💳 BIT' : '💵 КЭШ'}
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-2xl font-black text-white tracking-tighter tabular-nums mb-[-4px]">
                      {order.totalAmount} <span className="text-orange-500 text-sm font-bold">₪</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
