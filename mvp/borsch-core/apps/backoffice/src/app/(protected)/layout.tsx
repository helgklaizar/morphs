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
import { TopHeader } from "@/components/TopHeader";
import { AiAssistantOverlay } from "@/components/AiAssistantOverlay";
import { BotMessageSquare } from "lucide-react";
export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [isAiOpen, setIsAiOpen] = useState(false);
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
      <TopHeader />
      
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto px-4 lg:px-8 py-6 w-full custom-scrollbar relative">
        <div className="w-full min-h-full flex flex-col relative">
          {children}
        </div>
      </main>

      {/* Floating AI Button (Bottom Center - Drop) */}
      <button
        onClick={() => setIsAiOpen(true)}
        className="fixed bottom-0 left-1/2 -translate-x-1/2 px-16 md:px-24 pt-3 pb-2 bg-gradient-to-t from-orange-600 to-orange-400 hover:from-orange-500 hover:to-orange-300 text-white rounded-t-full flex items-center justify-center shadow-[0_-5px_25px_rgba(249,115,22,0.4)] hover:shadow-[0_-5px_35px_rgba(249,115,22,0.6)] hover:pb-3 transition-all z-40 border-t border-x border-white/10 group"
        title="Открыть ИИ помощника"
      >
        <BotMessageSquare className="w-6 h-6 group-hover:scale-110 transition-transform" />
      </button>

      <AiAssistantOverlay isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} />

      <ToastContainer />
      <RealtimeProvider />
    </div>
  );
}
