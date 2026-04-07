"use client";

import { OrderNavBadge } from "@/components/OrderNavBadge";
import { StoreStatusControls } from "@/components/StoreStatusControls";
import { pb } from "@/lib/pb";
import { 
  LayoutDashboard, 
  CreditCard, 
  ChefHat
} from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useThemeStore, RealtimeProvider } from '@rms/core';
import { ToastContainer } from "@/components/ui/ToastContainer";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const { colors } = useThemeStore();

  useEffect(() => {
    // Check session validity using PocketBase
    if (!pb.authStore.isValid) {
      router.replace('/login');
    } else {
      setIsChecking(false);
    }
  }, [router]);

  useEffect(() => {
    const root = document.documentElement;
    Object.entries(colors).forEach(([key, val]) => {
      root.style.setProperty(`--theme-${key}`, val);
    });
  }, [colors]);

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const getBtnClass = (isActive: boolean) => 
    `flex shrink-0 items-center justify-center gap-2 px-5 py-3.5 rounded-full transition-all text-[11px] font-black uppercase tracking-widest text-white shadow-lg ${isActive ? 'ring-2 ring-white/30 scale-[1.05] opacity-100 z-10' : 'opacity-50 hover:opacity-100 hover:scale-[1.05]'}`;

  return (
    <div className="flex-1 bg-[#0a0a0a] flex flex-col relative w-full overflow-hidden h-screen text-white">
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto px-4 lg:px-8 pt-6 pb-32 w-full custom-scrollbar relative">
        <div className="max-w-[1800px] mx-auto min-h-full flex flex-col relative">
          {children}
        </div>
      </main>

      {/* Floating Glass Dock Navigation */}
      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 bg-white/5 backdrop-blur-3xl px-3 py-3 rounded-[2rem] border border-white/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)]">
        <button onClick={() => router.push('/dashboard')} 
          className={getBtnClass(pathname === '/dashboard')}
          style={{ backgroundColor: colors.dashboard }}
        >
          <LayoutDashboard className="w-5 h-5 shrink-0" /> 
          <span className="hidden md:inline">Дашборд</span>
        </button>

        <button onClick={() => router.push('/pos')} 
          className={getBtnClass(pathname === '/pos')}
          style={{ backgroundColor: colors.pos }}
        >
          <CreditCard className="w-5 h-5 shrink-0" /> 
          <span className="hidden md:inline">Касса</span>
        </button>
        
        <OrderNavBadge />

        <button onClick={() => router.push('/menu')} 
          className={getBtnClass(pathname === '/menu')}
          style={{ backgroundColor: colors.menu }}
        >
          <ChefHat className="w-5 h-5 shrink-0" /> 
          <span className="hidden md:inline">Меню</span>
        </button>
      </nav>

      <ToastContainer />
      <RealtimeProvider />
    </div>
  );
}
