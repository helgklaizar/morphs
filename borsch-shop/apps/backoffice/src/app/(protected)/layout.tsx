"use client";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AiSidebar } from "@/components/AiSidebar";
import { Bot } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [isAiOpen, setIsAiOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/login');
      } else {
        setIsChecking(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) router.replace('/login');
    });

    return () => subscription.unsubscribe();
  }, [router]);

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1 overflow-auto bg-background flex flex-col relative w-full">
        <div className="flex h-14 items-center justify-between border-b px-6 shrink-0 w-full">
          <SidebarTrigger />
          <button 
            onClick={() => setIsAiOpen(true)}
            className="flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-full bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 transition-colors"
          >
            <Bot className="w-4 h-4" />
            <span className="hidden sm:inline">ИИ Ассистент</span>
          </button>
        </div>
        <div className="p-6 w-full flex-1 relative">{children}</div>
      </main>
      <AiSidebar isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} />
    </SidebarProvider>
  );
}
