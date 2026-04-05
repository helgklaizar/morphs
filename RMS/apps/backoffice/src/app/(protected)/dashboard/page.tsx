"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { 
  PlusCircle, 
  CalendarDays, 
  TrendingUp, 
  UtensilsCrossed, 
  Package, 
  UserCircle,
  Banknote,
  PiggyBank,
  Wallet,
  Smartphone,
  Receipt,
  Star,
  DollarSign,
  Tag,
  Warehouse,
  Flame,
  CheckCircle2,
  XCircle,
  Clock
} from "lucide-react";
import { useOrdersStore } from "@/store/useOrdersStore";
import { useHistoryStore } from "@/store/useHistoryStore";
import { useMenuStore } from "@/store/useMenuStore";
import { useInventoryStore } from "@/store/useInventoryStore";
import { useRecipesStore } from "@/store/useRecipesStore";
import { useAssembliesStore } from "@/store/useAssembliesStore";
import { useShiftsStore } from "@/store/useShiftsStore";
import { useWasteStore } from "@/store/useWasteStore";
import { computeAnalytics, AnalyticsData } from "@/lib/analytics";
import { PDFGenerator } from "@/lib/pdf";
import { FileDown, Truck } from "lucide-react";
import { AiInsightCard } from "@/components/ai/AiInsightCard";
import { useAiAdvisor } from "@/hooks/useAiAdvisor";
import { useModulesStore, SystemModuleId } from "@/store/useModulesStore";

type TabType = 'overview' | 'finance' | 'sales' | 'inventory' | 'workload' | 'subscriptions' | 'heatmap';

function DashboardContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  useEffect(() => {
     const tab = searchParams.get('tab') as TabType;
     if (tab) setActiveTab(tab);
  }, [searchParams]);

  const ai = useAiAdvisor('dashboard');

  const { orders, fetchOrders, subscribeToOrders, unsubscribeFromOrders, isLoading: oLoading } = useOrdersStore();
  const { history, fetchHistory, isLoading: hLoading } = useHistoryStore();
  const { items: menuItems, fetchMenuItems, isLoading: mLoading } = useMenuStore();
  const { categories: inventoryCats, fetchInventory, isLoading: iLoading } = useInventoryStore();
  const { recipes, fetchRecipes, isLoading: rLoading } = useRecipesStore();
  const { assemblies, fetchAssemblies, isLoading: aLoading } = useAssembliesStore();
  const { shifts, fetchShifts, isLoading: sLoading } = useShiftsStore();
  const { records: waste, fetchWaste, isLoading: wLoading } = useWasteStore();

  useEffect(() => {
    fetchOrders();
    fetchHistory();
    fetchMenuItems();
    fetchInventory();
    fetchRecipes();
    fetchAssemblies();
    fetchShifts();
    fetchWaste();
    ai.fetchInsights();
    
    subscribeToOrders();
    return () => {
      unsubscribeFromOrders();
    };
  }, [fetchOrders, fetchHistory, fetchMenuItems, fetchInventory, fetchRecipes, fetchAssemblies, fetchShifts, fetchWaste, subscribeToOrders, unsubscribeFromOrders, ai.fetchInsights]);

  const loading = oLoading || hLoading || mLoading || iLoading || rLoading || aLoading || sLoading || wLoading;
  const allOrdersList = useMemo(() => [...orders, ...history], [orders, history]);

  const analytics = useMemo(() => {
    if (loading) return null;
    return computeAnalytics(allOrdersList, menuItems, inventoryCats, recipes, assemblies, shifts, waste);
  }, [allOrdersList, menuItems, inventoryCats, recipes, assemblies, shifts, waste, loading]);

  const stats = useMemo(() => {
    const today = new Date();
    const todayOrders = allOrdersList.filter(o => {
      const dateStr = (o.reservationDate && o.reservationDate.length > 5) ? o.reservationDate : o.createdAt;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return false; // Skip invalid dates
      
      return d.getFullYear() === today.getFullYear() &&
             d.getMonth() === today.getMonth() &&
             d.getDate() === today.getDate();
    });
    
    const revenueOrders = todayOrders.filter(o => o.status !== 'cancelled');

    return {
      newOrders: orders.filter(o => o.status === 'new').length,
      todayOrders: todayOrders.length,
      revenue: revenueOrders.reduce((sum, o) => sum + o.totalAmount, 0),
      menuItemsCount: menuItems.filter(m => m.isActive).length,
      inventoryItemsCount: inventoryCats.reduce((sum, cat) => sum + cat.items.length, 0),
    };
  }, [allOrdersList, orders, menuItems, inventoryCats]);

  const recentOrders = useMemo(() => allOrdersList.slice(0, 5), [allOrdersList]);

  // Revenue Heatmap: compute revenue by day-of-week × hour
  const heatmapData = useMemo(() => {
    const DAYS = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
    const matrix: { dow: number; hour: number; revenue: number; count: number }[] = [];
    const map = new Map<string, { revenue: number; count: number }>();
    allOrdersList.forEach(o => {
      if (o.status === 'cancelled') return;
      const d = new Date(o.createdAt);
      if (isNaN(d.getTime())) return;
      const key = `${d.getDay()}-${d.getHours()}`;
      const cur = map.get(key) || { revenue: 0, count: 0 };
      map.set(key, { revenue: cur.revenue + (o.totalAmount || 0), count: cur.count + 1 });
    });
    for (let dow = 0; dow < 7; dow++) {
      for (let hour = 0; hour < 24; hour++) {
        const val = map.get(`${dow}-${hour}`) || { revenue: 0, count: 0 };
        matrix.push({ dow, hour, ...val });
      }
    }
    const maxRev = Math.max(...matrix.map(m => m.revenue), 1);
    return { matrix, maxRev, DAYS };
  }, [allOrdersList]);

  const { isModuleEnabled } = useModulesStore();

  const tabs: { id: TabType; label: string; icon: any; requiredModule?: SystemModuleId }[] = [
    { id: 'overview', label: 'Обзор', icon: UserCircle },
    { id: 'finance', label: 'Финансы', icon: Banknote, requiredModule: 'orders' },
    { id: 'sales', label: 'Продажи', icon: UtensilsCrossed, requiredModule: 'orders' },
    { id: 'inventory', label: 'Склад', icon: Warehouse, requiredModule: 'inventory' },
    { id: 'workload', label: 'Нагрузка', icon: Flame, requiredModule: 'orders' },
    { id: 'subscriptions', label: 'Подписки', icon: CalendarDays, requiredModule: 'orders' },
    { id: 'heatmap', label: 'Heatmap', icon: TrendingUp, requiredModule: 'orders' },
  ];

  const visibleTabs = tabs.filter(t => !t.requiredModule || isModuleEnabled(t.requiredModule));

  // If active tab is not visible, fallback to overview
  useEffect(() => {
    if (activeTab !== 'overview' && !visibleTabs.find(t => t.id === activeTab)) {
      setActiveTab('overview');
    }
  }, [activeTab, visibleTabs]);

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Дашборд и Аналитика</h1>
          <p className="text-muted-foreground">Обзор ключевых показателей ресторана</p>
        </div>
        {!loading && (
          <button 
            onClick={() => {
              const today = new Date();
              today.setHours(0,0,0,0);
              const tomorrow = new Date(today);
              tomorrow.setDate(tomorrow.getDate() + 1);
              
              const todayOrders = allOrdersList.filter(o => {
                const d = new Date(o.createdAt);
                return d >= today && d < tomorrow;
              });

              PDFGenerator.generateZReport(todayOrders, today, new Date());
            }}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <FileDown className="w-5 h-5 text-orange-500" />
            СКАЧАТЬ Z-ОТЧЁТ (PDF)
          </button>
        )}
      </div>

      <div className="flex bg-[#141414] border border-white/5 rounded-2xl p-1 overflow-x-auto custom-scrollbar">
        {visibleTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id 
                ? 'bg-[#FF6B00] text-white shadow-lg shadow-orange-500/20' 
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <AiInsightCard 
        module="dashboard" 
        insights={ai.insights} 
        isLoading={ai.isLoading} 
        onRefresh={ai.fetchInsights}
      />

      {loading ? (
        <div className="flex h-64 items-center justify-center bg-[#141414] rounded-3xl border border-white/5">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF6B00]"></div>
        </div>
      ) : (
        <div className="animate-in fade-in duration-300">
          
          {/* TAB: Обзор */}
          {activeTab === 'overview' && (
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
                <StatCard 
                  title="Выручка" 
                  value={`${stats.revenue.toFixed(0)} ₪`} 
                  subtitle="за сегодня"
                  icon={<TrendingUp className="h-5 w-5 text-white" />}
                  gradient="bg-gradient-to-br from-emerald-500 to-teal-500"
                  borderColor="border-emerald-500/20"
                  valueColor="text-emerald-500"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <PillCard 
                  title="Блюд в меню"
                  value={stats.menuItemsCount.toString()}
                  subtitle="всего активных"
                  icon={<UtensilsCrossed className="h-6 w-6 text-indigo-500" />}
                  iconBg="bg-indigo-500/10"
                  valueColor="text-indigo-500"
                />
                <PillCard 
                  title="На складе"
                  value={stats.inventoryItemsCount.toString()}
                  subtitle="позиций"
                  icon={<Package className="h-6 w-6 text-cyan-500" />}
                  iconBg="bg-cyan-500/10"
                  valueColor="text-cyan-500"
                />
              </div>

              <div className="pt-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-5 w-1 rounded-full bg-orange-500"></div>
                  <h2 className="text-xl font-bold">Последние заказы</h2>
                </div>
                
                <div className="rounded-2xl border border-white/5 bg-[#141414] overflow-hidden">
                  {recentOrders.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">Нет заказов</div>
                  ) : (
                    recentOrders.map((o, i) => (
                      <div key={o.id} className="group">
                        {i > 0 && <div className="h-px w-full bg-white/5"></div>}
                        <div className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10">
                            <UserCircle className="h-5 w-5 text-orange-500" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold">{o.customerName || 'Неизвестный'}</p>
                            <p className="text-xs text-muted-foreground">{o.customerPhone || 'Нет телефона'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-orange-500">{o.totalAmount || 0} ₪</p>
                            <div className="mt-1 inline-flex items-center rounded-full bg-orange-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-orange-500 uppercase">
                              {o.status || 'NEW'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: Финансы */}
          {activeTab === 'finance' && analytics && (
            <div className="space-y-8">
              {/* Первый раздел */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-5 w-1 rounded-full bg-green-500"></div>
                  <h2 className="text-xl font-bold">Основные показатели</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <FinanceCard title="Общая Выручка" value={`${analytics.totalRevenue.toFixed(0)} ₪`} icon={<Wallet />} color="text-green-500" bg="bg-green-500/10" />
                  <FinanceCard 
                    title="Средний Чек" 
                    value={analytics.completedOrdersCount > 0 ? `${(analytics.totalRevenue / analytics.completedOrdersCount).toFixed(0)} ₪` : '0 ₪'} 
                    icon={<Receipt />} 
                    color="text-teal-500" 
                    bg="bg-teal-500/10" 
                  />
                  <FinanceCard title="Прибыль (без доставки)" subtitle="Выручка минус доставка" value={`${(analytics.totalRevenue - analytics.deliveryRevenue).toFixed(0)} ₪`} icon={<TrendingUp />} color="text-emerald-500" bg="bg-emerald-500/10" />
                  <FinanceCard title="Оплата Наличными" value={`${analytics.cashRevenue.toFixed(0)} ₪`} icon={<Banknote />} color="text-orange-400" bg="bg-orange-500/10" />
                  <FinanceCard title="Оплата Bit / Картой" value={`${analytics.bitRevenue.toFixed(0)} ₪`} icon={<Smartphone />} color="text-purple-500" bg="bg-purple-500/10" />
                  <FinanceCard title="Оплата за Доставку" value={`${analytics.deliveryRevenue.toFixed(0)} ₪`} icon={<Warehouse />} color="text-blue-400" bg="bg-blue-500/10" />
                </div>
              </div>

              {/* Второй раздел */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-5 w-1 rounded-full bg-orange-500"></div>
                  <h2 className="text-xl font-bold">Операционные расходы и профит</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <FinanceCard title="Реальный Профит" subtitle="учёт зарплат и списаний" value={`${analytics.realNetProfit.toFixed(0)} ₪`} icon={<PiggyBank />} color="text-orange-500" bg="bg-orange-600/10" />
                  <FinanceCard title="Грязная Прибыль" subtitle="без учёта зарплат" value={`${analytics.netProfit.toFixed(0)} ₪`} icon={<TrendingUp />} color="text-blue-500" bg="bg-blue-500/10" />
                  <FinanceCard title="Зарплаты" value={`${analytics.totalStaffCosts.toFixed(0)} ₪`} icon={<UserCircle />} color="text-red-400" bg="bg-red-500/10" />
                  <FinanceCard title="Списания (Waste)" value={`${analytics.totalWasteCosts.toFixed(0)} ₪`} icon={<Flame />} color="text-red-500" bg="bg-red-700/10" />
                </div>
              </div>
            </div>
          )}

          {/* TAB: Продажи */}
          {activeTab === 'sales' && analytics && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <ListCard title="ТОП-10 Продаваемых блюд (в шт.)" items={analytics.topSellingDishes} icon={<Star className="text-white w-4 h-4"/>} iconBg="bg-orange-500"
                  renderValue={(i: any) => `${i.count} шт.`}
                  renderKey={(i: any) => i.name}
                />
                <ListCard title="ТОП-10 Прибыльных блюд (маржа)" items={analytics.topProfitableDishes} icon={<DollarSign className="text-white w-4 h-4"/>} iconBg="bg-green-500"
                  renderValue={(i: any) => `${i.profit.toFixed(2)} ₪`}
                  valueColor="text-green-500"
                  renderKey={(i: any) => i.name}
                />
              </div>
            </div>
          )}

          {/* TAB: Склад */}
          {activeTab === 'inventory' && analytics && (
            <div className="space-y-6">
              <FinanceCard title="Капитал на Складе (Итого)" value={`${analytics.totalInventoryCapital.toFixed(2)} ₪`} icon={<Warehouse />} color="text-slate-400" bg="bg-slate-500/10" className="md:w-1/2"/>
              
              <div className="grid md:grid-cols-2 gap-6">
                <ListCard title="Капитал по Колонкам (Инвентарь)" items={Object.entries(analytics.inventoryCapitalByCategory).map(([k,v]) => ({name: k, cap: v}))} icon={<Tag className="text-slate-400 w-4 h-4"/>} iconBg="bg-slate-500/20"
                  renderValue={(i: any) => `${i.cap.toFixed(2)} ₪`}
                  valueColor="text-blue-400"
                  renderKey={(i: any) => i.name}
                />
                <ListCard title="ТОП-10 Расходов на ингредиенты (от заказов)" items={analytics.mostUsedIngredients} icon={<Flame className="text-white w-4 h-4"/>} iconBg="bg-slate-700"
                  renderValue={(i: any) => `-${i.cost.toFixed(2)} ₪`}
                  valueColor="text-red-500"
                  renderKey={(i: any) => i.name}
                />
              </div>
            </div>
          )}

          {/* TAB: Нагрузка */}
          {activeTab === 'workload' && analytics && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                 <FinanceCard title="Успешные Заказы" value={`${analytics.completedOrdersCount} шт.`} icon={<CheckCircle2 />} color="text-green-500" bg="bg-green-500/10" />
                 <FinanceCard title="Отмененные Заказы" value={`${analytics.cancelledOrdersCount} шт. (${analytics.completedOrdersCount + analytics.cancelledOrdersCount > 0 ? (analytics.cancelledOrdersCount/(analytics.completedOrdersCount+analytics.cancelledOrdersCount)*100).toFixed(1) : 0}%)`} icon={<XCircle />} color="text-red-500" bg="bg-red-500/10" />
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <ListCard title="Пиковые Часы Нагрузки (ТОП)" items={analytics.ordersByHour.slice(0, 7)} icon={<Clock className="text-white w-4 h-4"/>} iconBg="bg-blue-600"
                    renderValue={(i: any) => `${i.count} заказов`}
                    renderKey={(i: any) => i.hour}
                  />
              </div>
            </div>
          )}

          {/* TAB: Подписки */}
          {activeTab === 'subscriptions' && analytics && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                 <div className="h-5 w-1 rounded-full bg-orange-500"></div>
                 <h2 className="text-xl font-bold">Статистика по заказам (Подписки)</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                 <FinanceCard title="Всего Отгрузок (в днях)" value={`${analytics.subscriptionOrdersCount} шт.`} icon={<CalendarDays />} color="text-orange-500" bg="bg-orange-500/10" />
                 <FinanceCard title="Общая Выручка" value={`${analytics.subscriptionRevenue.toFixed(0)} ₪`} icon={<Wallet />} color="text-green-500" bg="bg-green-500/10" />
                 <FinanceCard title="Оплата Наличными" value={`${analytics.subscriptionCashRevenue.toFixed(0)} ₪`} icon={<Banknote />} color="text-orange-400" bg="bg-orange-500/10" />
                 <FinanceCard title="Оплата Bit/Картой" value={`${analytics.subscriptionBitRevenue.toFixed(0)} ₪`} icon={<Smartphone />} color="text-purple-500" bg="bg-purple-500/10" />
                 <FinanceCard title="С Доставкой (Выручка)" value={`${analytics.subscriptionDeliveryRevenue.toFixed(0)} ₪`} icon={<Truck />} color="text-blue-400" bg="bg-blue-500/10" />
                 <FinanceCard title="Самовывоз (Выручка)" value={`${analytics.subscriptionPickupRevenue.toFixed(0)} ₪`} icon={<Package />} color="text-teal-400" bg="bg-teal-500/10" />
              </div>
            </div>
          )}

          {/* TAB: Heatmap */}
          {activeTab === 'heatmap' && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-5 w-1 rounded-full bg-orange-500" />
                  <h2 className="text-xl font-bold">Revenue Heatmap</h2>
                </div>
                <p className="text-sm text-white/40 mb-6">Выручка по дням недели и часам — сразу видно «горячие» периоды</p>
              </div>

              <div className="overflow-x-auto">
                <div style={{ display: 'grid', gridTemplateColumns: '40px repeat(24, 1fr)', gap: 3, minWidth: 820 }}>
                  {/* Hour labels */}
                  <div />
                  {Array.from({ length: 24 }, (_, h) => (
                    <div key={h} style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', textAlign: 'center', paddingBottom: 4 }}>
                      {h}h
                    </div>
                  ))}

                  {/* Rows */}
                  {heatmapData.DAYS.map((day, dow) => (
                    <>
                      {/* Day label */}
                      <div key={`label-${dow}`} style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', fontWeight: 700 }}>
                        {day}
                      </div>
                      {/* Cells */}
                      {Array.from({ length: 24 }, (_, hour) => {
                        const cell = heatmapData.matrix.find(m => m.dow === dow && m.hour === hour)!;
                        const intensity = cell.revenue / heatmapData.maxRev;
                        const alpha = intensity > 0 ? 0.15 + intensity * 0.85 : 0.05;
                        const bg = intensity > 0.7 ? `rgba(249,115,22,${alpha})` : intensity > 0.3 ? `rgba(251,191,36,${alpha})` : `rgba(99,102,241,${alpha})`;
                        return (
                          <div
                            key={`${dow}-${hour}`}
                            title={cell.revenue > 0 ? `${day} ${hour}:00 — ₪${cell.revenue.toFixed(0)} (${cell.count} заказов)` : undefined}
                            style={{
                              height: 32,
                              borderRadius: 4,
                              background: bg,
                              cursor: cell.revenue > 0 ? 'pointer' : 'default',
                              border: '1px solid rgba(255,255,255,0.04)',
                              transition: 'transform 0.1s',
                            }}
                            className={cell.revenue > 0 ? 'hover:scale-110' : ''}
                          />
                        );
                      })}
                    </>
                  ))}
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-6 text-xs text-white/40">
                <div className="flex items-center gap-2">
                  <div style={{ width: 12, height: 12, borderRadius: 2, background: 'rgba(99,102,241,0.5)' }} /> Низкая активность
                </div>
                <div className="flex items-center gap-2">
                  <div style={{ width: 12, height: 12, borderRadius: 2, background: 'rgba(251,191,36,0.7)' }} /> Средняя
                </div>
                <div className="flex items-center gap-2">
                  <div style={{ width: 12, height: 12, borderRadius: 2, background: 'rgba(249,115,22,0.9)' }} /> Пик
                </div>
              </div>
            </div>
          )}

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

// Subcomponents

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

function PillCard({ title, value, subtitle, icon, iconBg, valueColor }: any) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-white/5 bg-[#141414] p-5 shadow-sm">
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconBg}`}>
        {icon}
      </div>
      <div>
        <h3 className={`text-2xl font-bold ${valueColor}`}>{value}</h3>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function FinanceCard({ title, value, subtitle, icon, color, bg, className = "" }: any) {
  return (
    <div className={`flex items-center gap-4 p-6 rounded-2xl border border-white/5 bg-[#141414] ${className}`}>
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${bg} ${color}`}>
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-medium text-neutral-400">{title}</h3>
        <p className="text-2xl font-extrabold text-white mt-1">{value || '0'}</p>
        {subtitle && <p className="text-[10px] text-neutral-500 uppercase tracking-wider">{subtitle}</p>}
      </div>
    </div>
  );
}

function ListCard({ title, items, icon, iconBg, renderValue, renderKey, valueColor = "text-white" }: any) {
  return (
    <div className="bg-[#141414] border border-white/5 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-white/5">
        <h2 className="text-lg font-bold text-white">{title}</h2>
      </div>
      {items.length === 0 ? (
        <div className="p-6 text-center text-neutral-500">Нет данных</div>
      ) : (
        <div className="divide-y divide-white/5">
          {items.map((item: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between p-4 hover:bg-white/5 transition">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex flex-shrink-0 items-center justify-center ${iconBg}`}>
                  {icon}
                </div>
                <span className="font-medium text-white">{renderKey(item)}</span>
              </div>
              <div className={`font-bold ${valueColor}`}>{renderValue(item)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
