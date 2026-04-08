"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Package, 
  ChefHat, 
  Users, 
  History, 
  Settings, 
  ClipboardList, 
  Truck, 
  FileText, 
  Layers, 
  Building, 
  Megaphone, 
  Globe, 
  Bot, 
  BookOpen, 
  Clock, 
  LogOut, 
  Store,
  CreditCard,
  Briefcase,
  Flame,
  Type,
  ZoomIn,
  ZoomOut,
  Languages,
  ChevronDown,
  Grid,
  DollarSign,
  UtensilsCrossed,
  Warehouse,
  Coffee,
  Monitor,
  Map
} from "lucide-react";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger 
} from "@/components/ui/collapsible";

import { useModulesStore } from '@rms/core';
import type { SystemModuleId } from '@rms/core';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
type NavItem = { title: string; url: string; icon: any; moduleId?: SystemModuleId };
type NavGroup = { label: string; items: NavItem[]; moduleId?: SystemModuleId };

const navGroups: NavGroup[] = [
  {
    label: "Операции",
    items: [
      { title: "Касса", url: "/pos", icon: CreditCard, moduleId: "pos" },
      { title: "Заказы", url: "/orders", icon: ShoppingBag, moduleId: "orders" },
    ],
  },
  {
    label: "Производство",
    moduleId: "menu",
    items: [
      { title: "Меню", url: "/menu", icon: ChefHat },
    ],
  },
  {
    label: "Аналитика",
    moduleId: "analytics",
    items: [
      { title: "Обзор", url: "/dashboard?tab=overview", icon: LayoutDashboard },
    ],
  },
];


export function AppSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [zoom, setZoom] = useState(100);

  useEffect(() => {
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



  const { isModuleEnabled } = useModulesStore();

  const isLinkActive = (url: string) => {
    if (url.includes('?')) {
      const [path, query] = url.split('?');
      if (pathname !== path) return false;
      const urlParams = new URLSearchParams(query);
      for (const [key, value] of urlParams.entries()) {
        if (searchParams.get(key) !== value) return false;
      }
      return true;
    }
    return pathname.startsWith(url);
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-0">
        <div className="py-6 px-4">
          <h2 className="text-xl font-bold tracking-tight">borsch.shop</h2>
          <p className="text-sm text-muted-foreground">Backoffice</p>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <div className="pt-4">
          {navGroups.map((group, groupIdx) => {
            if (group.moduleId && !isModuleEnabled(group.moduleId)) return null;

            const visibleItems = group.items.filter(
              (item) => !item.moduleId || isModuleEnabled(item.moduleId)
            );

            if (visibleItems.length === 0) return null;

            return (
              <div key={groupIdx}>
                <Collapsible defaultOpen={true} className="group/collapsible">
                  <SidebarGroup>
                    <CollapsibleTrigger asChild>
                      <SidebarGroupLabel className="text-white/30 text-[10px] pb-1 h-auto font-bold uppercase tracking-wider select-none cursor-pointer hover:text-white transition-colors flex items-center justify-between w-full">
                        {group.label}
                        <ChevronDown className="w-3 h-3 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                      </SidebarGroupLabel>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarGroupContent>
                        <SidebarMenu>
                          {visibleItems.map((item) => (
                            <SidebarMenuItem key={item.title}>
                              <SidebarMenuButton 
                                isActive={isLinkActive(item.url)} 
                                tooltip={item.title}
                                onClick={() => router.push(item.url)}
                                className="w-full text-white/70 hover:text-white transition-colors"
                              >
                                <item.icon className="w-5 h-5" />
                                <span className="font-bold text-sm tracking-tight">{item.title}</span>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          ))}
                        </SidebarMenu>
                      </SidebarGroupContent>
                    </CollapsibleContent>
                  </SidebarGroup>
                </Collapsible>
                {groupIdx < navGroups.length - 1 && <SidebarSeparator className="my-2 bg-white/5 mx-4" />}
              </div>
            );
          })}
        </div>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-white/10 shrink-0 bg-[#0A0A0A] mt-auto">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between bg-white/5 rounded-xl p-2 border border-white/5">
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
            onClick={() => window.location.href = '/login'}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors border border-red-500/20"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium text-sm">Выйти</span>
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
