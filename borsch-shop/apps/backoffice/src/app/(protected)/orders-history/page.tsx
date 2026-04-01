"use client";

import { History, Calendar, UserCircle } from "lucide-react";
import { useEffect } from "react";
import { useHistoryStore } from "@/store/useHistoryStore";

export default function OrdersHistoryPage() {
  const { history, isLoading, fetchHistory } = useHistoryStore();

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">История заказов</h1>
          <p className="text-sm text-muted-foreground mt-1">Архив завершенных и отмененных заказов</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-10">
        {isLoading && history.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center w-full">
             <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin mb-4" />
             <p className="text-xl font-semibold text-gray-500">Загрузка архива...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <History className="h-16 w-16 text-[#2A2A2A] mb-4" />
            <p className="text-xl font-semibold text-gray-500">Архив пуст</p>
            <p className="text-sm text-gray-600 mt-2">Архивированные заказы появятся здесь</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map(order => (
              <div key={order.id} className="bg-[#141414] border border-white/5 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-white/10 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10">
                    <UserCircle className="h-6 w-6 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">{order.customerName || 'Неизвестный клиент'}</h3>
                    <p className="text-xs text-white/50">{order.customerPhone || 'Нет телефона'}</p>
                    <div className="text-xs text-white/40 mt-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(order.createdAt).toLocaleString('ru-RU')}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col md:items-end gap-1">
                  <div className="text-lg font-bold text-orange-500">{order.totalAmount} ₪</div>
                  <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${order.status === 'cancelled' ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                    {order.status === 'cancelled' ? 'Отменен' : 'Завершен'}
                  </div>
                  <div className="text-xs text-white/30 mt-1">Оплата: {order.paymentMethod}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
