"use client";

import { useEffect, useState, useMemo } from "react";
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
import { useMenuStore } from "@/store/useMenuStore";
import { useInventoryStore } from "@/store/useInventoryStore";
import { useRecipesStore } from "@/store/useRecipesStore";
import { useAssembliesStore } from "@/store/useAssembliesStore";
import { useHistoryStore } from "@/store/useHistoryStore";
import { computeAnalytics, AnalyticsData } from "@/lib/analytics";

type TabType = 'overview' | 'finance' | 'sales' | 'inventory' | 'workload';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const { orders, fetchOrders, subscribeToOrders, unsubscribeFromOrders, isLoading: oLoading } = useOrdersStore();
  const { history, fetchHistory, isLoading: hLoading } = useHistoryStore();
  const { items: menuItems, fetchMenuItems, isLoading: mLoading } = useMenuStore();
  const { categories: inventoryCats, fetchInventory, isLoading: iLoading } = useInventoryStore();
  const { recipes, fetchRecipes, isLoading: rLoading } = useRecipesStore();
  const { assemblies, fetchAssemblies, isLoading: aLoading } = useAssembliesStore();

  useEffect(() => {
    fetchOrders();
    fetchHistory();
    fetchMenuItems();
    fetchInventory();
    fetchRecipes();
    fetchAssemblies();
    
    subscribeToOrders();
    return () => {
      unsubscribeFromOrders();
    };
  }, [fetchOrders, fetchHistory, fetchMenuItems, fetchInventory, fetchRecipes, fetchAssemblies, subscribeToOrders, unsubscribeFromOrders]);

  const loading = oLoading || hLoading || mLoading || iLoading || rLoading || aLoading;

  const analytics = useMemo(() => {
    if (loading) return null;
    const allOrders = [...orders, ...history];
    return computeAnalytics(allOrders, menuItems, inventoryCats, recipes, assemblies);
  }, [orders, history, menuItems, inventoryCats, recipes, assemblies, loading]);

  const today = new Date();
  
  const todayOrders = orders.filter(o => {
    const dateForCalculation = new Date(o.reservationDate || o.createdAt);
    return dateForCalculation.getFullYear() === today.getFullYear() &&
           dateForCalculation.getMonth() === today.getMonth() &&
           dateForCalculation.getDate() === today.getDate();
  });
  
  const revenueOrders = todayOrders.filter(o => o.status !== 'cancelled');

  const stats = {
    newOrders: orders.filter(o => o.status === 'new').length,
    todayOrders: todayOrders.length,
    revenue: revenueOrders.reduce((sum, o) => sum + o.totalAmount, 0),
    menuItemsCount: menuItems.filter(m => m.isActive).length,
    inventoryItemsCount: inventoryCats.reduce((sum, cat) => sum + cat.items.length, 0),
  };

  const recentOrders = orders.slice(0, 5);

  const tabs: { id: TabType; label: string; icon: any }[] = [
    { id: 'overview', label: 'Обзор', icon: UserCircle },
    { id: 'finance', label: 'Финансы', icon: Banknote },
    { id: 'sales', label: 'Продажи', icon: UtensilsCrossed },
    { id: 'inventory', label: 'Склад', icon: Warehouse },
    { id: 'workload', label: 'Нагрузка', icon: Flame },
  ];

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Дашборд и Аналитика</h1>
        <p className="text-muted-foreground">Обзор ключевых показателей ресторана</p>
      </div>

      <div className="flex bg-[#141414] border border-white/5 rounded-2xl p-1 overflow-x-auto custom-scrollbar">
        {tabs.map(tab => (
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
                  value={stats.newOrders.toString()} 
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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <FinanceCard title="Общая Выручка" value={`${analytics.totalRevenue.toFixed(2)} ₪`} icon={<Wallet />} color="text-green-500" bg="bg-green-500/10" />
              <FinanceCard title="Чистая Прибыль" value={`${analytics.netProfit.toFixed(2)} ₪`} icon={<PiggyBank />} color="text-blue-500" bg="bg-blue-500/10" />
              <FinanceCard title="Оплата Наличными" value={`${analytics.cashRevenue.toFixed(2)} ₪`} icon={<Banknote />} color="text-orange-500" bg="bg-orange-500/10" />
              <FinanceCard title="Оплата Bit" value={`${analytics.bitRevenue.toFixed(2)} ₪`} icon={<Smartphone />} color="text-purple-500" bg="bg-purple-500/10" />
              <FinanceCard 
                title="Средний Чек" 
                value={analytics.completedOrdersCount > 0 ? `${(analytics.totalRevenue / analytics.completedOrdersCount).toFixed(2)} ₪` : '0 ₪'} 
                icon={<Receipt />} 
                color="text-teal-500" 
                bg="bg-teal-500/10" 
              />
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

        </div>
      )}
    </div>
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

function FinanceCard({ title, value, icon, color, bg, className = "" }: any) {
  return (
    <div className={`flex items-center gap-4 p-6 rounded-2xl border border-white/5 bg-[#141414] ${className}`}>
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${bg} ${color}`}>
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-medium text-neutral-400">{title}</h3>
        <p className="text-2xl font-extrabold text-white mt-1">{value || '0'}</p>
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
