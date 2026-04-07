"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import { 
  PlusCircle, 
  CalendarDays, 
  TrendingUp,
  UserCircle
} from "lucide-react";
import { useOrdersStore } from '@rms/core';

function DashboardContent() {
  const { orders, fetchOrders, subscribeToOrders, unsubscribeFromOrders, isLoading: oLoading } = useOrdersStore();

  useEffect(() => {
    fetchOrders();
    subscribeToOrders();
    return () => unsubscribeFromOrders();
  }, [fetchOrders, subscribeToOrders, unsubscribeFromOrders]);

  const loading = oLoading;
  const allOrdersList = useMemo(() => [...orders], [orders]);
  
  const [topItems, setTopItems] = useState<{name: string; qty: number}[]>([]);
  const [topItemsLoading, setTopItemsLoading] = useState(true);

  useEffect(() => {
    pb.collection('order_items').getFullList({ fields: 'menu_item_name,quantity' }).then(items => {
      const counts: Record<string, number> = {};
      items.forEach(i => {
        if (!i.menu_item_name) return;
        counts[i.menu_item_name] = (counts[i.menu_item_name] || 0) + i.quantity;
      });
      const sorted = Object.entries(counts).map(([name, qty]) => ({name, qty})).sort((a,b) => b.qty - a.qty).slice(0, 50);
      setTopItems(sorted);
    }).catch(console.error).finally(() => setTopItemsLoading(false));
  }, []);

  const stats = useMemo(() => {
    const today = new Date();
    
    let allTimeRevenue = 0;
    let allTimeBit = 0;
    let allTimeCash = 0;
    let todayOrdersCount = 0;
    let todayRevenue = 0;

    allOrdersList.forEach(o => {
      if (o.status === 'cancelled') return;

      allTimeRevenue += o.totalAmount;
      if (o.paymentMethod === 'bit') allTimeBit += o.totalAmount;
      else allTimeCash += o.totalAmount;

      const dateStr = (o.reservationDate && o.reservationDate.length > 5) ? o.reservationDate : o.createdAt;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return;
      
      const isToday = d.getFullYear() === today.getFullYear() &&
             d.getMonth() === today.getMonth() &&
             d.getDate() === today.getDate();

      if (isToday) {
        todayOrdersCount++;
        todayRevenue += o.totalAmount;
      }
    });

    return {
      newOrders: orders.filter(o => o.status === 'new').length,
      todayOrders: todayOrdersCount,
      todayRevenue,
      allTimeRevenue,
      allTimeBit,
      allTimeCash
    };
  }, [allOrdersList, orders]);

  const recentOrders = useMemo(() => allOrdersList.slice(0, 5), [allOrdersList]);

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-black tracking-tighter uppercase bg-gradient-to-r from-white to-white/50 bg-clip-text text-transparent">Дашборд</h1>
          <p className="text-muted-foreground">Обзор ключевых показателей ресторана</p>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center bg-[#141414] rounded-3xl border border-white/5">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF6B00]"></div>
        </div>
      ) : (
        <div className="animate-in fade-in duration-300">
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <StatCard 
                  title="Новых заказов" 
                  value={orders.filter(o => o.status === 'new').length.toString()} 
                  subtitle="требуют внимания"
                  icon={<PlusCircle className="h-5 w-5 text-white" />}
                  gradient="bg-gradient-to-br from-orange-500 to-orange-400"
                  borderColor="border-orange-500/20"
                  valueColor="text-orange-500"
                />
                <StatCard 
                  title="Сегодня" 
                  value={stats.todayOrders.toString()} 
                  subtitle="заказов"
                  icon={<CalendarDays className="h-5 w-5 text-white" />}
                  gradient="bg-gradient-to-br from-amber-500 to-amber-400"
                  borderColor="border-amber-500/20"
                  valueColor="text-amber-500"
                />
                <div className="rounded-[24px] border border-[#222] bg-gradient-to-b from-[#1c1c1e] to-[#0a0a0a] p-6 shadow-2xl col-span-1 md:col-span-1 flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[40px] -mr-10 -mt-10 pointer-events-none" />
                  <div>
                    <div className="flex items-center gap-3 mb-6 relative z-10">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/20">
                        <TrendingUp className="h-6 w-6 text-white" />
                       </div>
                      <h3 className="font-black text-xl text-white tracking-widest uppercase">Выручка</h3>
                    </div>
                    
                    <div className="space-y-4 relative z-10">
                      <div className="flex justify-between items-end border-b border-white/5 pb-3">
                        <span className="text-sm font-bold text-white/40 uppercase tracking-widest">Сегодня</span>
                        <span className="text-4xl font-black text-emerald-400 tracking-tighter">{stats.todayRevenue.toFixed(0)} ₪</span>
                      </div>
                      <div className="flex justify-between items-end border-b border-white/5 pb-3">
                        <span className="text-sm font-bold text-white/40 uppercase tracking-widest">Все время</span>
                        <span className="text-3xl font-black text-white tracking-tighter">{stats.allTimeRevenue.toFixed(0)} ₪</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-2 flex gap-3 relative z-10">
                     <div className="flex-1 bg-white/5 rounded-2xl p-4 border border-white/5 hover:bg-white/10 transition-colors">
                        <span className="text-[11px] text-white/40 block mb-1 font-black tracking-widest">НАЛИЧНЫМИ</span>
                        <span className="text-2xl font-black text-white">{stats.allTimeCash.toFixed(0)} ₪</span>
                     </div>
                     <div className="flex-1 bg-purple-500/10 rounded-2xl p-4 border border-purple-500/20 hover:bg-purple-500/20 transition-colors">
                        <span className="text-[11px] text-purple-400/60 block mb-1 font-black tracking-widest">BIT / КАРТА</span>
                        <span className="text-2xl font-black text-purple-400">{stats.allTimeBit.toFixed(0)} ₪</span>
                     </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <div className="flex flex-col">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-5 w-1 rounded-full bg-orange-500"></div>
                    <h2 className="text-xl font-bold">Последние заказы</h2>
                  </div>
                  
                  <div className="rounded-2xl border border-white/5 bg-[#141414] overflow-hidden flex-1">
                    {recentOrders.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">Нет заказов</div>
                    ) : (
                      recentOrders.map((o, i) => (
                        <div key={o.id} className="group">
                          {i > 0 && <div className="h-px w-full bg-white/5"></div>}
                          <div className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/5 group-hover:bg-orange-500/10 transition-colors">
                              <Receipt className="h-5 w-5 text-white/50 group-hover:text-orange-500 transition-colors" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="truncate text-sm font-bold text-white">{o.customerName || 'Без названия'}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{new Date(o.createdAt).toLocaleString('ru-RU')}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-bold">{o.totalAmount} ₪</p>
                              {o.status === 'new' && <span className="text-[10px] font-bold text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full mt-1 inline-block">НОВЫЙ</span>}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-5 w-1 rounded-full bg-blue-500"></div>
                    <h2 className="text-xl font-bold">Топ продаж (Все время)</h2>
                  </div>
                  
                  <div className="rounded-2xl border border-white/5 bg-[#141414] overflow-hidden flex-1 max-h-[400px] overflow-y-auto custom-scrollbar">
                    {topItemsLoading ? (
                      <div className="p-8 text-center text-muted-foreground">Загрузка...</div>
                    ) : topItems.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">Нет данных</div>
                    ) : (
                      topItems.map((item, i) => (
                        <div key={item.name} className="group flex items-center justify-between p-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                          <div className="flex items-center gap-3">
                             <div className="w-6 h-6 rounded bg-white/5 text-white/50 flex items-center justify-center text-xs font-bold">{i + 1}</div>
                             <span className="text-sm font-bold text-white truncate max-w-[200px] block">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full">
                             <span className="text-white font-black text-sm">{item.qty}</span>
                             <span className="text-white/40 text-[10px] uppercase font-bold">шт</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-10 text-white/50 animate-pulse">Загрузка аналитики...</div>}>
      <DashboardContent />
    </Suspense>
  );
}

function StatCard({ title, value, subtitle, icon, gradient, borderColor, valueColor }: any) {
  return (
    <div className={`rounded-2xl border ${borderColor} bg-[#141414] p-5 shadow-sm`}>
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${gradient}`}>
        {icon}
      </div>
      <div className="mt-4">
        <h3 className={`text-3xl font-bold tracking-tight ${valueColor}`}>{value}</h3>
        <p className="mt-1 text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}
