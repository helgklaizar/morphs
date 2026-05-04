"use client";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AiSidebar } from "@/components/AiSidebar";
import { pb } from "@/lib/pocketbase";
import { 
  Bot, 
  LayoutDashboard, 
  CreditCard, 
  ShoppingBag, 
  ChefHat,
  Store,
  Truck,
  Clock 
} from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useOrdersStore } from "@/store/useOrdersStore";
import { useLandingSettingsStore } from "@/store/useLandingSettingsStore";
import { useThemeStore } from "@/store/useThemeStore";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { useAiInsightsStore, getModuleFromPath } from "@/store/useAiInsightsStore";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const { orders, fetchOrders, subscribeToOrders, unsubscribeFromOrders } = useOrdersStore();
  const { settings, fetchSettings, updateSettings } = useLandingSettingsStore();
  const { colors } = useThemeStore();
  
  const currentModule = getModuleFromPath(pathname);
  const { insightsByModule, fetchInsights } = useAiInsightsStore();
  const currentInsights = currentModule ? (insightsByModule[currentModule] || []) : [];

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

  useEffect(() => {
    if (pb.authStore.isValid) {
      fetchOrders();
      fetchSettings();
      subscribeToOrders();
    }
    return () => {
      unsubscribeFromOrders();
    };
  }, []);

  useEffect(() => {
    if (currentModule) {
      fetchInsights(currentModule);
    }
  }, [currentModule]);

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const hasNewOrders = orders.some(o => o.status === 'new');
  const hasActiveOrders = orders.some(o => ['new', 'preparing', 'ready', 'delivering'].includes(o.status));

  const getBtnClass = (isActive: boolean) => 
    `flex shrink-0 items-center justify-center gap-2 px-3 lg:px-4 py-2 lg:py-2.5 w-auto rounded-xl transition-all text-sm lg:text-base font-bold text-white shadow-md ${isActive ? 'ring-2 ring-white ring-offset-2 ring-offset-background scale-[1.02] opacity-100' : 'opacity-70 hover:opacity-100 hover:scale-[1.02]'}`;

  const getOrdersStyle = () => {
    if (hasNewOrders) return { backgroundColor: '#22c55e', boxShadow: '0 0 20px rgba(34, 197, 94, 0.4)' };
    if (hasActiveOrders) return { backgroundColor: '#eab308', boxShadow: '0 0 20px rgba(234, 179, 8, 0.4)' };
    return { backgroundColor: colors.orders };
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1 bg-background flex flex-col relative w-full overflow-hidden h-screen">
        <div className="flex min-h-[64px] h-auto py-2 items-center justify-between border-b px-4 lg:px-6 shrink-0 w-full bg-background/50 backdrop-blur-md z-10 gap-4 flex-wrap w-full">
          <div className="flex items-center gap-3 lg:gap-6 flex-wrap">
            <SidebarTrigger />
            
            <div className="flex items-center gap-2 lg:gap-3 flex-wrap">
               <button onClick={() => router.push('/dashboard')} 
                 className={getBtnClass(pathname === '/dashboard')}
                 style={{ backgroundColor: colors.dashboard }}
               >
                 <LayoutDashboard className="w-[18px] h-[18px] lg:w-[22px] lg:h-[22px]" /> <span className="hidden sm:inline tracking-tight">Дашборд</span>
               </button>

               <div className="w-px h-6 lg:h-8 bg-white/10 mx-0.5 lg:mx-1 hidden lg:block" />

               <button onClick={() => router.push('/pos')} 
                 className={getBtnClass(pathname === '/pos')}
                 style={{ backgroundColor: colors.pos }}
               >
                 <CreditCard className="w-[18px] h-[18px] lg:w-[22px] lg:h-[22px]" /> <span className="hidden sm:inline tracking-tight">Касса</span>
               </button>
               
               <button onClick={() => router.push('/orders')} 
                 className={`${getBtnClass(pathname === '/orders')} relative`}
                 style={getOrdersStyle()}
               >
                 <ShoppingBag className="w-[18px] h-[18px] lg:w-[22px] lg:h-[22px]" /> <span className="hidden sm:inline tracking-tight">Заказы</span>
                 {hasActiveOrders && <div className="absolute top-1 lg:top-2.5 right-1 lg:right-2.5 w-2.5 h-2.5 rounded-full bg-white animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.8)]" />}
               </button>

               <button onClick={() => router.push('/menu')} 
                 className={getBtnClass(pathname === '/menu')}
                 style={{ backgroundColor: colors.menu }}
               >
                 <ChefHat className="w-[18px] h-[18px] lg:w-[22px] lg:h-[22px]" /> <span className="hidden sm:inline tracking-tight">Меню</span>
               </button>
            </div>
            
            <div className="w-px h-8 bg-white/10 mx-1 lg:mx-2 hidden 2xl:block" />
            
            <div className="flex shrink-0 items-center justify-start gap-1 lg:gap-1.5 bg-white/5 p-1 lg:p-1.5 rounded-xl whitespace-nowrap flex-wrap order-last xl:order-none">
               <button onClick={() => settings && updateSettings({ is_pickup_enabled: !settings.is_pickup_enabled })} className={`flex shrink-0 items-center gap-1.5 lg:gap-2 px-2.5 lg:px-4 py-1.5 lg:py-2 rounded-lg text-[11px] lg:text-[13px] font-bold uppercase tracking-wider transition-all border ${settings?.is_pickup_enabled ? 'bg-orange-500 text-white border-orange-500/20 shadow-md' : 'text-white/40 border-transparent hover:text-white/70 hover:bg-white/5'}`}>
                 <Store className="w-[14px] h-[14px] lg:w-[16px] lg:h-[16px] flex-none" /> <span className="hidden md:inline">Самовывоз</span>
               </button>
               <button onClick={() => settings && updateSettings({ is_delivery_enabled: !settings.is_delivery_enabled })} className={`flex shrink-0 items-center gap-1.5 lg:gap-2 px-2.5 lg:px-4 py-1.5 lg:py-2 rounded-lg text-[11px] lg:text-[13px] font-bold uppercase tracking-wider transition-all border ${settings?.is_delivery_enabled ? 'bg-orange-500 text-white border-orange-500/20 shadow-md' : 'text-white/40 border-transparent hover:text-white/70 hover:bg-white/5'}`}>
                 <Truck className="w-[14px] h-[14px] lg:w-[16px] lg:h-[16px] flex-none" /> <span className="hidden md:inline">Доставка</span>
               </button>
               <button onClick={() => settings && updateSettings({ is_preorder_mode: !settings.is_preorder_mode })} className={`flex shrink-0 items-center gap-1.5 lg:gap-2 px-2.5 lg:px-4 py-1.5 lg:py-2 rounded-lg text-[11px] lg:text-[13px] font-bold uppercase tracking-wider transition-all border ${settings?.is_preorder_mode ? 'bg-purple-500 text-white border-purple-500/20 shadow-md' : 'text-white/40 border-transparent hover:text-white/70 hover:bg-white/5'}`}>
                 <Clock className="w-[14px] h-[14px] lg:w-[16px] lg:h-[16px] flex-none" /> <span className="hidden md:inline">Предзаказ</span>
               </button>
            </div>
          </div>
          
          <div className="flex items-center gap-2 ml-auto">
            <button 
              onClick={() => setIsAiOpen(true)}
              className="flex shrink-0 items-center justify-center gap-2 text-xs lg:text-sm font-bold px-3 lg:px-4 py-1.5 lg:py-1.5 rounded-full bg-[#8B5CF6]/10 text-[#8B5CF6] hover:bg-[#8B5CF6]/20 transition-colors whitespace-nowrap relative"
            >
              <Bot className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
              <span className="">ИИ Ассистент</span>
              {currentInsights.length > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 lg:w-3 lg:h-3 bg-red-500 border-2 border-background rounded-full" />
              )}
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 w-full custom-scrollbar relative">
          <div className="max-w-[1600px] mx-auto min-h-full flex flex-col">
            {children}
          </div>
        </div>
      </main>
      <AiSidebar isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} />
      <ToastContainer />
    </SidebarProvider>
  );
}
