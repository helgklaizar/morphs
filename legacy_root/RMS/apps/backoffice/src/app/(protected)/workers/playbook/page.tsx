"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChefHat, Wine, Map, Building2 } from "lucide-react";
import { PlaybookTab } from "@/store/usePlaybookStore";
import { PlaybookBoard } from "./components/PlaybookBoard";

const TABS: { id: PlaybookTab; label: string; icon: any; color: string }[] = [
  { id: 'kitchen', label: 'Кухня', icon: ChefHat, color: 'text-orange-500' },
  { id: 'bar', label: 'Бар', icon: Wine, color: 'text-purple-500' },
  { id: 'floor', label: 'Зал', icon: Map, color: 'text-emerald-500' },
  { id: 'manager', label: 'Менеджер', icon: Building2, color: 'text-blue-500' },
];

export default function PlaybookPage() {
  const [activeTab, setActiveTab] = useState<PlaybookTab>('kitchen');

  return (
    <div className="flex h-full flex-col max-w-[1400px]">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-white/10 mb-6 gap-4">
        <div className="flex items-center gap-4">
          <Link href="/workers" className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Методичка</h1>
            <p className="text-sm text-muted-foreground mt-1 tracking-widest uppercase">Поэтапные чек-листы для смен</p>
          </div>
        </div>
        
        <div className="flex bg-[#141414] border border-white/5 rounded-2xl p-1 overflow-x-auto custom-scrollbar">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap ${
                  isActive 
                    ? 'bg-white/10 text-white shadow-sm' 
                    : 'text-neutral-500 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? tab.color : 'opacity-50'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pb-10">
        <PlaybookBoard tab={activeTab} />
      </div>
    </div>
  );
}
