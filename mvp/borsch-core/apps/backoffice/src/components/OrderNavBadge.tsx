"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useThemeStore, useOrdersQuery } from '@rms/core';
import { ShoppingBag } from "lucide-react";

export function OrderNavBadge() {
  const pathname = usePathname();
  const { colors } = useThemeStore();
  const { data: orders = [] } = useOrdersQuery();
  
  const hasNewOrders = orders.some((o: any) => o.status === 'new');
  const hasActiveOrders = orders.some((o: any) => ['new', 'preparing', 'ready', 'delivering'].includes(o.status));

  const getBtnClass = (isActive: boolean) => 
    `flex shrink-0 items-center justify-center gap-2 px-4 py-2 rounded-xl text-[11px] md:text-[13px] font-bold uppercase tracking-wider transition-all border ${
      isActive 
        ? "border-white/20 text-white shadow-lg shadow-white/5" 
        : "border-transparent text-white/40 hover:text-white/80 hover:bg-white/5 bg-transparent"
    }`;

    const getOrdersStyle = () => {
      if (hasNewOrders) return { backgroundColor: '#22c55e', boxShadow: '0 0 20px rgba(34, 197, 94, 0.4)', color: '#000' };
      if (hasActiveOrders) return { backgroundColor: '#eab308', boxShadow: '0 0 20px rgba(234, 179, 8, 0.4)', color: '#000' };
      return { backgroundColor: 'rgba(220, 38, 38, 0.15)', color: '#fca5a5', boxShadow: 'inset 0 0 10px rgba(220,38,38,0.1)' };
    };

  return (
    <Link href="/orders" 
      className={`${getBtnClass(pathname === '/orders')} relative`}
      style={getOrdersStyle()}
    >
      <ShoppingBag className="w-5 h-5 shrink-0" /> 
      <span className="hidden md:inline">Заказы</span>
    </Link>
  );
}
