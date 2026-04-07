"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CreditCard, ChefHat } from "lucide-react";
import { useThemeStore } from "@rms/core";
import { OrderNavBadge } from "@/components/OrderNavBadge";
import { StoreStatusControls } from "@/components/StoreStatusControls";

export function TopHeader() {
  const pathname = usePathname();
  const { colors } = useThemeStore();

  const getNavBtnClass = (isActive: boolean) => 
    `flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] md:text-[13px] font-bold uppercase tracking-wider transition-all border ${
      isActive 
        ? "border-white/20 text-white shadow-lg shadow-white/5" 
        : "border-transparent text-white/40 hover:text-white/80 hover:bg-white/5 bg-transparent"
    }`;

  // Hide TopHeader on login or completely detached pages if they exist, but ProtectedLayout wraps this.
  return (
    <header className="shrink-0 w-full px-4 lg:px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-white/5 bg-[#0a0a0a] relative z-50">
      
      {/* Navigation section */}
      <div className="flex items-center gap-6 shrink-0">
        
        {/* Primary/First button: Orders */}
        <OrderNavBadge />

        {/* Secondary grouped buttons */}
        <div className="flex items-center gap-2">
          <Link href="/pos" 
            className={getNavBtnClass(pathname === '/pos')}
            style={{ backgroundColor: pathname === '/pos' ? colors.pos : 'transparent' }}
          >
            <CreditCard className="w-4 h-4 shrink-0" /> 
            <span className="hidden md:inline">Касса</span>
          </Link>
          
          <Link href="/menu" 
            className={getNavBtnClass(pathname === '/menu')}
            style={{ backgroundColor: pathname === '/menu' ? colors.menu : 'transparent' }}
          >
            <ChefHat className="w-4 h-4 shrink-0" /> 
            <span className="hidden md:inline">Меню</span>
          </Link>

          <Link href="/dashboard" 
            className={getNavBtnClass(pathname === '/dashboard')}
            style={{ backgroundColor: pathname === '/dashboard' ? colors.dashboard : 'transparent' }}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" /> 
            <span className="hidden md:inline">Аналитика</span>
          </Link>
        </div>
      </div>

      {/* Global Status Controls (Самовывоз, Доставка, Предзаказ) */}
      <div className="flex items-center shrink-0">
        <StoreStatusControls />
      </div>
      
    </header>
  );
}
