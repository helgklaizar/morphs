"use client";

import { useState, useEffect } from "react";
import { Home, ClipboardList, LayoutList, Package, Layers, Users, Building, Megaphone, Languages, Bot, BookOpen, Clock, Globe, LogOut, ZoomIn, ZoomOut, Type, Truck, Store } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useLandingSettingsStore } from "@/store/useLandingSettingsStore";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";

const navGroups = [
  {
    items: [
      { title: "Дашборд", url: "/dashboard", icon: Home },
    ]
  },
  {
    items: [
      { title: "Заказы", url: "/orders", icon: ClipboardList },
      { title: "История заказов", url: "/orders-history", icon: Clock },
      { title: "Клиенты", url: "/clients", icon: Users },
    ]
  },
  {
    items: [
      { title: "Меню", url: "/menu", icon: LayoutList },
      { title: "Рецепты", url: "/recipes", icon: BookOpen },
      { title: "Сборки", url: "/assemblies", icon: Layers },
      { title: "Склад", url: "/inventory", icon: Package },
      { title: "Поставщики", url: "/suppliers", icon: Building },
    ]
  },
  {
    items: [
      { title: "Маркетинг", url: "/marketing", icon: Megaphone },
      { title: "Переводы", url: "/translations", icon: Languages },
      { title: "Лендинг", url: "/landing-settings", icon: Globe },
    ]
  }
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { settings, fetchSettings, updateSettings } = useLandingSettingsStore();

  const [zoom, setZoom] = useState(100);

  useEffect(() => {
    fetchSettings();
    const saved = localStorage.getItem("system_zoom");
    if (saved) {
      const z = parseInt(saved, 10);
      setZoom(z);
      document.documentElement.style.fontSize = `${z}%`;
    }
  }, []);

  const handleZoom = (delta: number) => {
    const newZoom = Math.max(80, Math.min(150, zoom + delta));
    setZoom(newZoom);
    document.documentElement.style.fontSize = `${newZoom}%`;
    localStorage.setItem("system_zoom", newZoom.toString());
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <div className="py-6 px-4">
            <h2 className="text-xl font-bold tracking-tight">Kitchen Manager</h2>
            <p className="text-sm text-muted-foreground">Mac Backoffice V2</p>
          </div>
          
          {navGroups.map((group, groupIdx) => (
            <div key={groupIdx}>
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <Link href={item.url} className="w-full">
                          <SidebarMenuButton isActive={pathname === item.url}>
                            <item.icon />
                            <span>{item.title}</span>
                          </SidebarMenuButton>
                        </Link>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
              {groupIdx < navGroups.length - 1 && <SidebarSeparator className="my-2 bg-white/5 mx-4" />}
            </div>
          ))}

          <SidebarSeparator className="my-2 bg-white/5 mx-4" />
          <SidebarGroup>
            <div className="px-4 mb-2">
              <span className="text-xs font-bold text-white/40 uppercase tracking-wider">Прием заказов</span>
            </div>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <button 
                    onClick={async () => {
                      if (settings) {
                        await updateSettings({ is_pickup_enabled: !settings.is_pickup_enabled });
                      }
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors border ${settings?.is_pickup_enabled ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-transparent text-white/70 border-transparent hover:bg-white/5'}`}
                  >
                    <div className="flex items-center gap-3">
                      <Store className="w-4 h-4 opacity-70" />
                      <span className="font-medium">Самовывоз</span>
                    </div>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${settings?.is_pickup_enabled ? 'border-orange-400 bg-orange-500' : 'border-white/20'}`}>
                      {settings?.is_pickup_enabled && <div className="w-2 h-2 rounded-sm bg-white" />}
                    </div>
                  </button>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <button 
                    onClick={async () => {
                      if (settings) {
                        await updateSettings({ is_delivery_enabled: !settings.is_delivery_enabled });
                      }
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 mt-1 rounded-lg text-sm transition-colors border ${settings?.is_delivery_enabled ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-transparent text-white/70 border-transparent hover:bg-white/5'}`}
                  >
                    <div className="flex items-center gap-3">
                      <Truck className="w-4 h-4 opacity-70" />
                      <span className="font-medium">Доставка</span>
                    </div>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${settings?.is_delivery_enabled ? 'border-orange-400 bg-orange-500' : 'border-white/20'}`}>
                      {settings?.is_delivery_enabled && <div className="w-2 h-2 rounded-sm bg-white" />}
                    </div>
                  </button>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <button 
                    onClick={async () => {
                      if (settings) {
                        await updateSettings({ is_preorder_mode: !settings.is_preorder_mode });
                      }
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 mt-1 rounded-lg text-sm transition-colors border ${settings?.is_preorder_mode ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-transparent text-white/70 border-transparent hover:bg-white/5'}`}
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 opacity-70" />
                      <span className="font-medium">Предзаказ</span>
                    </div>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${settings?.is_preorder_mode ? 'border-purple-400 bg-purple-500' : 'border-white/20'}`}>
                      {settings?.is_preorder_mode && <div className="w-2 h-2 rounded-sm bg-white" />}
                    </div>
                  </button>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

        </SidebarGroup>
      </SidebarContent>
      <div className="p-4 border-t border-white/10 shrink-0 bg-[#0A0A0A] mt-auto">
        <div className="flex items-center justify-between mb-4 bg-white/5 rounded-xl p-2 border border-white/5">
          <div className="flex items-center text-white/50 text-xs gap-2 px-2 font-medium">
            <Type className="w-4 h-4" /> ШРИФТ
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => handleZoom(-5)} className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded-md transition-colors text-white/70">
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold w-10 text-center text-white/90">{zoom}%</span>
            <button onClick={() => handleZoom(5)} className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded-md transition-colors text-white/70">
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>

        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors border border-red-500/20"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium text-sm">Выйти</span>
        </button>
      </div>
    </Sidebar>
  );
}
