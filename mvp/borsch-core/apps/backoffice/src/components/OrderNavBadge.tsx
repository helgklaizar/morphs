"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useOrdersStore, useThemeStore } from '@rms/core';
import { ShoppingBag } from "lucide-react";
import { pb } from "@/lib/pb";

export function OrderNavBadge() {
  const router = useRouter();
  const pathname = usePathname();
  const { colors } = useThemeStore();
  const { orders, fetchOrders, subscribeToOrders, unsubscribeFromOrders } = useOrdersStore();
  
  useEffect(() => {
    if (pb.authStore.isValid) {
      fetchOrders();
      subscribeToOrders();
    }
    return () => {
      unsubscribeFromOrders();
    };
  }, []);

  const hasNewOrders = orders.some(o => o.status === 'new');
  const hasActiveOrders = orders.some(o => ['new', 'preparing', 'ready', 'delivering'].includes(o.status));

  const getBtnClass = (isActive: boolean) => 
    `flex shrink-0 items-center justify-center gap-2 px-5 py-3.5 rounded-full transition-all text-[11px] font-black uppercase tracking-widest text-white shadow-lg ${isActive ? 'ring-2 ring-white/30 scale-[1.05] opacity-100 z-10' : 'opacity-50 hover:opacity-100 hover:scale-[1.05]'}`;

  const getOrdersStyle = () => {
    if (hasNewOrders) return { backgroundColor: '#22c55e', boxShadow: '0 0 20px rgba(34, 197, 94, 0.4)' };
    if (hasActiveOrders) return { backgroundColor: '#eab308', boxShadow: '0 0 20px rgba(234, 179, 8, 0.4)' };
    return { backgroundColor: colors.orders };
  };

  return (
    <button onClick={() => router.push('/orders')} 
      className={`${getBtnClass(pathname === '/orders')} relative`}
      style={getOrdersStyle()}
    >
      <ShoppingBag className="w-5 h-5 shrink-0" /> 
      <span className="hidden md:inline">Заказы</span>
      {hasActiveOrders && <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-white animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.8)]" />}
    </button>
  );
}
