"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import { PlusCircle, CalendarDays, TrendingUp, UserCircle, Receipt } from "lucide-react";
import { useOrdersQuery } from '@rms/core';
import { pb } from "@/lib/pb";

const getStatusStyle = (s: string) => {
  if (s === 'new') return { label: 'Новый', bg: 'bg-orange-500/10', text: 'text-orange-500' };
  if (s === 'preparing') return { label: 'Готовится', bg: 'bg-amber-500/10', text: 'text-amber-500' };
  if (s === 'ready') return { label: 'Готов', bg: 'bg-green-500/10', text: 'text-green-500' };
  if (s === 'delivering') return { label: 'У курьера', bg: 'bg-blue-500/10', text: 'text-blue-500' };
  if (s === 'completed') return { label: 'Завершен', bg: 'bg-emerald-500/10', text: 'text-emerald-500' };
  return { label: s, bg: 'bg-white/10', text: 'text-white/50' };
};

function DashboardContent() {
  const { data: orders = [], isLoading: oLoading } = useOrdersQuery();
  const loading = oLoading;
  const allOrdersList = useMemo(() => [...orders], [orders]);
  
  const [allTimeStats, setAllTimeStats] = useState({ allTimeRevenue: 0, allTimeBit: 0, allTimeCash: 0 });
  const [topItems, setTopItems] = useState<{name: string; qty: number}[]>([]);
  const [topItemsLoading, setTopItemsLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const allOrders = await pb.collection('orders').getFullList({ filter: 'status != "cancelled"' });
        let revenue = 0;
        let bit = 0;
        let cash = 0;
        const validIds = new Set();
        
        allOrders.forEach(o => {
          validIds.add(o.id);
          revenue += o.total_amount || 0;
          if (o.payment_method === 'bit') bit += o.total_amount || 0;
          else cash += o.total_amount || 0;
        });
        
        setAllTimeStats({ allTimeRevenue: revenue, allTimeBit: bit, allTimeCash: cash });

        const menus = await pb.collection('menu_items').getFullList();
        const validNames = new Set(menus.map(m => m.name));

        const items = await pb.collection('order_items').getFullList();
        const counts: Record<string, number> = {};
        items.forEach(i => {
          const lcase = i.menu_item_name?.toLowerCase() || '';
          if (!i.menu_item_name || !validIds.has(i.order_id)) return;
          if (lcase.includes('доставка') || lcase.includes('хлеб') || lcase.includes('приборы')) return;
          if (!validNames.has(i.menu_item_name)) return;
          
          counts[i.menu_item_name] = (counts[i.menu_item_name] || 0) + i.quantity;
        });
        const sorted = Object.entries(counts).map(([name, qty]) => ({name, qty})).sort((a,b) => b.qty - a.qty).slice(0, 7);
        setTopItems(sorted);
      } catch (e) {
        console.error(e);
      } finally {
        setTopItemsLoading(false);
      }
    }
    fetchDashboardData();
  }, []);

  const stats = useMemo(() => {
    const today = new Date();
    
    let todayOrdersCount = 0;
    let todayRevenue = 0;

    allOrdersList.forEach(o => {
      if (o.status === 'cancelled') return;

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
      todayRevenue
    };
  }, [allOrdersList, orders]);

  const recentOrders = useMemo(() => allOrdersList.slice(0, 5), [allOrdersList]);

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5 shrink-0 gap-4 flex-wrap">
        <div className="flex items-center gap-6">
          <h1 className="text-3xl lg:text-4xl font-black tracking-tighter uppercase bg-gradient-to-r from-white to-white/50 bg-clip-text text-transparent">Аналитика</h1>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center bg-[#141414] rounded-3xl border border-white/5">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF6B00]"></div>
        </div>
      ) : (
        <div>
            <div className="space-y-6">
              {/* Row 1: Новые/Сегодня + Последние заказы */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Block 1: Активность */}
                <div className="rounded-2xl border border-white/5 bg-[#141414] shadow-sm flex flex-col">
                  <div className="p-6 pb-4 border-b border-white/5 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5">
                      <CalendarDays className="h-5 w-5 text-amber-500" />
                    </div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Активность</h2>
                  </div>
                  <div className="p-6 grid grid-cols-2 gap-4 flex-1">
                    <div className="bg-white/5 rounded-xl p-5 flex flex-col justify-center border border-white/5 hover:bg-white/10 transition-colors">
                      <h3 className="text-4xl font-black tracking-tighter text-orange-500 mb-2">{orders.filter(o => o.status === 'new').length}</h3>
                      <p className="text-sm font-bold text-white">Новых заказов</p>
                      <p className="text-xs text-white/40 mt-1 uppercase tracking-wider font-semibold">ждут внимания</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-5 flex flex-col justify-center border border-white/5 hover:bg-white/10 transition-colors">
                      <h3 className="text-4xl font-black tracking-tighter text-amber-500 mb-2">{stats.todayOrders}</h3>
                      <p className="text-sm font-bold text-white">Заказов сегодня</p>
                      <p className="text-xs text-white/40 mt-1 uppercase tracking-wider font-semibold">за текущий день</p>
                    </div>
                  </div>
                </div>

                {/* Block 2: Заказы */}
                <div className="rounded-2xl border border-white/5 bg-[#141414] shadow-sm flex flex-col">
                  <div className="p-6 pb-4 border-b border-white/5 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5">
                      <Receipt className="h-5 w-5 text-orange-500" />
                    </div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Заказы</h2>
                  </div>
                  
                  <div className="flex-1 flex flex-col pb-2">
                    {recentOrders.length === 0 ? (
                      <div className="p-8 text-center text-white/40 m-auto font-medium">Нет недавних заказов</div>
                    ) : (
                      recentOrders.map((o, i) => {
                        const st = getStatusStyle(o.status);
                        return (
                        <div key={o.id} className="group px-6 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                          <div className={`flex items-center gap-4 py-4 border-l-2 border-transparent group-hover:${st.text.replace('text-', 'border-')}`}>
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${st.bg}`}>
                              <Receipt className={`h-5 w-5 transition-colors ${st.text}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="truncate text-sm font-bold text-white">{o.customerName || 'Без названия'}</p>
                              <p className="text-xs text-white/40 mt-1 font-medium">{new Date(o.createdAt).toLocaleString('ru-RU')}</p>
                            </div>
                            <div className="text-right flex flex-col items-end shrink-0">
                              <p className="text-sm font-black text-white">{o.totalAmount} ₪</p>
                              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full mt-1.5 inline-block ${st.bg} ${st.text}`}>
                                {st.label.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        </div>
                      )})
                    )}
                  </div>
                </div>

              </div>

              {/* Row 2: Выручка + Топ продаж */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                
                {/* Block 3: Выручка */}
                <div className="rounded-2xl border border-white/5 bg-[#141414] shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="p-6 pb-4 border-b border-white/5 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5">
                        <TrendingUp className="h-5 w-5 text-emerald-500" />
                      </div>
                      <h2 className="text-xl font-bold text-white tracking-tight">Выручка</h2>
                    </div>
                    
                    <div className="p-6 space-y-5">
                      <div className="flex justify-between items-end border-b border-white/5 pb-4">
                        <span className="text-sm font-bold text-white/50 uppercase tracking-wider">Сегодня</span>
                        <span className="text-4xl font-black text-emerald-400 tracking-tighter">{stats.todayRevenue.toFixed(0)} ₪</span>
                      </div>
                      <div className="flex justify-between items-end border-b border-white/5 pb-4">
                        <span className="text-sm font-bold text-white/50 uppercase tracking-wider">Все время</span>
                        <span className="text-3xl font-black text-white tracking-tighter">{allTimeStats.allTimeRevenue.toFixed(0)} ₪</span>
                      </div>
                    </div>
                  </div>

                  <div className="px-6 pb-6 flex gap-4">
                     <div className="flex-1 bg-white/5 border border-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors">
                        <span className="text-[11px] text-white/40 block mb-1.5 font-bold tracking-widest uppercase">Наличными</span>
                        <span className="text-2xl font-black text-white">{allTimeStats.allTimeCash.toFixed(0)} ₪</span>
                     </div>
                     <div className="flex-1 bg-white/5 border border-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors">
                        <span className="text-[11px] text-purple-400/80 block mb-1.5 font-bold tracking-widest uppercase">Bit / Карта</span>
                        <span className="text-2xl font-black text-purple-400">{allTimeStats.allTimeBit.toFixed(0)} ₪</span>
                     </div>
                  </div>
                </div>

                {/* Block 4: Продажи */}
                <div className="rounded-2xl border border-white/5 bg-[#141414] shadow-sm flex flex-col">
                  <div className="p-6 pb-4 border-b border-white/5 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5">
                      <TrendingUp className="h-5 w-5 text-blue-500" />
                    </div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Продажи (Топ)</h2>
                  </div>
                  
                  <div className="flex-1 flex flex-col pb-2">
                    {topItemsLoading ? (
                      <div className="p-8 text-center text-white/40 font-medium my-auto">Загрузка...</div>
                    ) : topItems.length === 0 ? (
                      <div className="p-8 text-center text-white/40 font-medium my-auto">Нет данных</div>
                    ) : (
                      topItems.map((item, i) => (
                        <div key={item.name} className="group flex items-center justify-between px-6 py-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                          <div className="flex items-center gap-4">
                             <div className="w-8 h-8 rounded-lg bg-white/5 text-white/50 flex items-center justify-center text-xs font-bold border border-white/5">{i + 1}</div>
                             <span className="text-sm font-bold text-white truncate max-w-[200px] block">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-2 bg-white/5 border border-white/5 px-3 py-1.5 rounded-full group-hover:bg-white/10 transition-colors">
                             <span className="text-white font-black text-sm">{item.qty}</span>
                             <span className="text-white/40 text-[10px] uppercase font-bold tracking-wider">Шт</span>
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


