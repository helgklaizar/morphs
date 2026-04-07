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
    <div className="flex items-center justify-between gap-2 mt-4 pt-4 border-t border-white/10 w-full">
      <button 
        onClick={() => updateSettings({ is_pickup_enabled: !settings.is_pickup_enabled })} 
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] md:text-[13px] font-bold uppercase tracking-wider transition-all border ${
          settings.is_pickup_enabled 
            ? "bg-gradient-to-r from-orange-500 to-orange-400 text-white border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.4)]" 
            : "bg-transparent text-white/40 border-transparent hover:text-white/80 hover:bg-white/5"
        }`}
      >
        <Store className="w-4 h-4" /> 
        <span className="hidden xl:inline">Самовывоз</span>
      </button>
      
      <button 
        onClick={() => updateSettings({ is_delivery_enabled: !settings.is_delivery_enabled })} 
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] md:text-[13px] font-bold uppercase tracking-wider transition-all border ${
          settings.is_delivery_enabled 
            ? "bg-gradient-to-r from-orange-500 to-orange-400 text-white border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.4)]" 
            : "bg-transparent text-white/40 border-transparent hover:text-white/80 hover:bg-white/5"
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
            ? "bg-gradient-to-r from-purple-500 to-purple-400 text-white border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.4)]" 
            : "bg-transparent text-white/40 border-transparent hover:text-white/80 hover:bg-white/5"
        }`}
      >
        <Clock className="w-4 h-4" /> 
        <span className="hidden xl:inline">Предзаказ</span>
      </button>
    </div>
  );
}
