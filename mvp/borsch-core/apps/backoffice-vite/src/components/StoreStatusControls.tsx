"use client";

import { useEffect } from "react";
import { Store, Truck, Clock } from "lucide-react";
import { useLandingSettingsStore } from '@/store/useLandingSettingsStore';

export function StoreStatusControls() {
  const { settings, fetchSettings, updateSettings } = useLandingSettingsStore();

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  if (!settings) return null;

  return (
    <div className="flex items-center justify-between gap-2 w-full">
      <button 
        onClick={() => updateSettings({ is_pickup_enabled: !settings.is_pickup_enabled })} 
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] md:text-[13px] font-bold uppercase tracking-wider transition-all border ${
          settings.is_pickup_enabled 
            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20" 
            : "bg-red-500/10 text-red-500/80 border-red-500/20 hover:bg-red-500/20"
        }`}
      >
        <Store className="w-4 h-4" /> 
        <span className="hidden xl:inline">Самовывоз</span>
      </button>
      
      <button 
        onClick={() => updateSettings({ is_delivery_enabled: !settings.is_delivery_enabled })} 
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] md:text-[13px] font-bold uppercase tracking-wider transition-all border ${
          settings.is_delivery_enabled 
            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20" 
            : "bg-red-500/10 text-red-500/80 border-red-500/20 hover:bg-red-500/20"
        }`}
      >
        <Truck className="w-4 h-4" /> 
        <span className="hidden xl:inline">Доставка</span>
      </button>

      <div className="w-px h-5 bg-white/10 mx-1" />

      <button 
        onClick={() => updateSettings({ is_preorder_mode: !settings.is_preorder_mode })} 
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] md:text-[13px] font-bold uppercase tracking-wider transition-all border ${
          settings.is_preorder_mode 
            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20" 
            : "bg-red-500/10 text-red-500/80 border-red-500/20 hover:bg-red-500/20"
        }`}
      >
        <Clock className="w-4 h-4" /> 
        <span className="hidden xl:inline">Предзаказ</span>
      </button>
    </div>
  );
}
