"use client";

import { useEffect, useState, useMemo } from "react";
import {
  ChefHat,
  Clock,
  CheckCircle2,
  Flame,
  Bike,
  UtensilsCrossed,
  ArrowRight,
  Users,
  Coffee,
} from "lucide-react";
import { useOrdersStore } from '@rms/core';
import { useMenuStore, MenuItem } from '@rms/core';
import { useToastStore } from '@rms/core';
import { OrderStatus, Order } from "@rms/types";

// KDS Columns config
const COLUMNS: {
  status: OrderStatus;
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  nextStatus?: OrderStatus;
  nextLabel?: string;
}[] = [
  {
    status: "new",
    label: "Новые",
    icon: Flame,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    nextStatus: "preparing",
    nextLabel: "В работу →",
  },
  {
    status: "pending",
    label: "Ожидают",
    icon: Clock,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    nextStatus: "preparing",
    nextLabel: "В работу →",
  },
  {
    status: "preparing",
    label: "Готовится",
    icon: ChefHat,
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
    nextStatus: "ready",
    nextLabel: "Готово ✓",
  },
  {
    status: "ready",
    label: "Готово",
    icon: CheckCircle2,
    color: "text-green-400",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
    nextStatus: "delivering",
    nextLabel: "Выдать →",
  },
  {
    status: "delivering",
    label: "Доставка",
    icon: Bike,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
    nextStatus: "completed",
    nextLabel: "Закрыть ✓",
  },
];

function useElapsedTime(createdAt: string) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const calc = () => {
      const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
      setElapsed(diff);
    };
    calc();
    const interval = setInterval(calc, 10000);
    return () => clearInterval(interval);
  }, [createdAt]);

  const mins = Math.floor(elapsed / 60);
  const isUrgent = mins >= 15;
  const isWarning = mins >= 8;
  return { mins, isUrgent, isWarning };
}

function OrderCard({
  order,
  nextStatus,
  nextLabel,
  activeTab,
  menuItems,
}: {
  order: Order;
  nextStatus?: OrderStatus;
  nextLabel?: string;
  activeTab: string;
  menuItems: MenuItem[];
}) {
  const { mins, isUrgent, isWarning } = useElapsedTime(order.createdAt);
  const { updateOrderStatus } = useOrdersStore();
  const { success, error } = useToastStore();
  const [advancing, setAdvancing] = useState(false);

  const handleAdvance = async () => {
    if (!nextStatus) return;
    setAdvancing(true);
    try {
      await updateOrderStatus(order.id, nextStatus);
      success(`Заказ #${order.id.slice(-4)} → ${nextLabel}`);
    } catch (e: any) {
      error("Ошибка обновления статуса");
    } finally {
      setAdvancing(false);
    }
  };

  const timerColor = isUrgent
    ? "text-red-400 animate-pulse"
    : isWarning
    ? "text-amber-400"
    : "text-white/40";

  return (
    <div
      className={`rounded-2xl border p-4 flex flex-col gap-3 transition-all duration-300 ${
        isUrgent
          ? "border-red-500/50 bg-red-500/5 shadow-lg shadow-red-500/10"
          : "border-white/10 bg-white/3 hover:border-white/20"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-black text-lg tracking-tighter text-white">
            #{order.id.slice(-4).toUpperCase()}
          </div>
          {order.customerName && (
            <div className="text-xs text-white/50 truncate max-w-[120px]">
              {order.customerName}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className={`flex items-center gap-1 text-xs font-bold ${timerColor}`}>
            <Clock className="w-3 h-3" />
            {mins}м
          </div>
          {order.tableId && (
            <div className="flex items-center gap-1 text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded-full">
              <Coffee className="w-3 h-3" />
              Зал
            </div>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="flex flex-col gap-1 border-t border-white/5 pt-3">
        {order.items?.filter(item => {
          const mi = menuItems.find(m => m.id === item.menuItemId || m.name === item.menuItemName);
          const dep = mi?.kitchenDepartment?.trim();
          if (!dep) return false; // Non-kitchen items don't appear on KDS
          if (activeTab === "all") return true;
          return dep === activeTab;
        }).map((item, i) => (
          <div key={i} className="flex justify-between items-baseline text-sm gap-2">
            <span className="text-white/70 truncate flex-1">{item.menuItemName}</span>
            <span className="text-white/40 text-xs flex-none">×{item.quantity}</span>
          </div>
        )) ?? (
          <div className="text-xs text-white/30 italic">Позиции не загружены</div>
        )}
      </div>
      {nextStatus && (
        <button
          onClick={handleAdvance}
          disabled={advancing}
          className="w-full py-2 rounded-xl text-xs font-bold tracking-wide bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all flex items-center justify-center gap-1 border border-white/5 hover:border-white/20"
        >
          {advancing ? (
            <div className="w-3 h-3 rounded-full border border-white/40 border-t-white animate-spin" />
          ) : (
            <>
              <ArrowRight className="w-3 h-3" />
              {nextLabel}
            </>
          )}
        </button>
      )}
    </div>
  );
}

export function KitchenTab() {
  const { orders, fetchOrders, subscribeToOrders, unsubscribeFromOrders } = useOrdersStore();
  const { items: menuItems, fetchMenuItems, subscribeToMenu, unsubscribeFromMenu } = useMenuStore();
  const [activeTab, setActiveTab] = useState<string>("all");

  useEffect(() => {
    fetchOrders();
    fetchMenuItems();
    subscribeToOrders();
    subscribeToMenu();
    return () => {
      unsubscribeFromOrders();
      unsubscribeFromMenu();
    };
  }, [fetchOrders, fetchMenuItems, subscribeToOrders, subscribeToMenu, unsubscribeFromOrders, unsubscribeFromMenu]);

  const departments = useMemo(() => {
    const deps = new Set<string>();
    menuItems.forEach(m => {
      if (m.kitchenDepartment && m.kitchenDepartment.trim() !== "") {
        deps.add(m.kitchenDepartment.trim());
      }
    });
    return Array.from(deps).sort();
  }, [menuItems]);

  const activeOrders = useMemo(() => {
    const allActive = orders.filter((o) => o.status !== "completed" && o.status !== "cancelled");
    
    if (activeTab === "all") {
      return allActive.filter(o => o.items?.some(item => {
        const mi = menuItems.find(m => m.id === item.menuItemId || m.name === item.menuItemName);
        return !!mi?.kitchenDepartment?.trim();
      }));
    }
    
    return allActive.filter(o => {
      return o.items?.some(item => {
        const mi = menuItems.find(m => m.id === item.menuItemId || m.name === item.menuItemName);
        return mi?.kitchenDepartment?.trim() === activeTab;
      });
    });
  }, [orders, activeTab, menuItems]);

  const byStatus = useMemo(() => {
    const map = new Map<OrderStatus, Order[]>();
    COLUMNS.forEach((col) => map.set(col.status, []));
    activeOrders.forEach((o) => {
      if (map.has(o.status as OrderStatus)) {
        map.get(o.status as OrderStatus)!.push(o);
      }
    });
    return map;
  }, [activeOrders]);

  const totalActive = activeOrders.length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-none p-6 border-b border-white/10 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <UtensilsCrossed className="w-6 h-6 text-orange-500" />
            <h1 className="text-2xl font-bold tracking-tight">Kitchen Display</h1>
            {totalActive > 0 && (
              <span className="bg-orange-500 text-white text-xs font-black px-2.5 py-1 rounded-full">
                {totalActive}
              </span>
            )}
          </div>
          <p className="text-sm text-white/40">
            Real-time статусы заказов · обновляется автоматически
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-full">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Live
        </div>
      </div>

      {/* Tabs */}
      {departments.length > 0 && (
        <div className="flex-none px-6 py-3 border-b border-white/5 flex gap-2 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${
              activeTab === 'all' 
                ? "bg-orange-500 text-white" 
                : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
            }`}
          >
            Главный экран (Все ордеры)
          </button>
          {departments.map((dep) => (
            <button
              key={dep}
              onClick={() => setActiveTab(dep)}
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${
                activeTab === dep
                  ? "bg-orange-500 text-white" 
                  : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
              }`}
            >
              ОТДЕЛ: {dep}
            </button>
          ))}
        </div>
      )}

      {/* Kanban columns */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
        <div className="flex gap-4 h-full min-w-max">
          {COLUMNS.map((col) => {
            const Icon = col.icon;
            const colOrders = byStatus.get(col.status) || [];
            return (
              <div
                key={col.status}
                className="flex flex-col w-64 rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden"
              >
                {/* Column header */}
                <div className={`px-4 py-3 border-b border-white/5 ${col.bgColor}`}>
                  <div className="flex items-center justify-between">
                    <div className={`flex items-center gap-2 font-bold text-sm ${col.color}`}>
                      <Icon className="w-4 h-4" />
                      {col.label}
                    </div>
                    {colOrders.length > 0 && (
                      <span
                        className={`text-xs font-black px-2 py-0.5 rounded-full ${col.bgColor} ${col.color} border ${col.borderColor}`}
                      >
                        {colOrders.length}
                      </span>
                    )}
                  </div>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                  {colOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-24 text-white/15 text-xs text-center">
                      <Icon className="w-6 h-6 mb-2 opacity-30" />
                      Пусто
                    </div>
                  ) : (
                    colOrders
                      .sort(
                        (a, b) =>
                          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                      )
                      .map((order) => (
                        <OrderCard
                          key={order.id}
                          order={order}
                          nextStatus={col.nextStatus}
                          nextLabel={col.nextLabel}
                          activeTab={activeTab}
                          menuItems={menuItems}
                        />
                      ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
