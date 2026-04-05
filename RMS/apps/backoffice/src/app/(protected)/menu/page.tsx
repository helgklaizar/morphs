"use client";

import { useState } from "react";
import { 
  Plus, 
  FolderTree, 
  Image as ImageIcon,
  Minus,
  Infinity,
  ToggleLeft,
  ToggleRight,
  ListOrdered
} from "lucide-react";

import { useMenuStore, MenuItem } from "@/store/useMenuStore";
import { useRecipesStore } from "@/store/useRecipesStore";
import { useAssembliesStore } from "@/store/useAssembliesStore";
import { useLandingSettingsStore } from "@/store/useLandingSettingsStore";
import { MenuItemModal } from "./components/MenuItemModal";
import { MenuCategoriesModal } from "./components/MenuCategoriesModal";
import { useEffect } from "react";
import { AiInsightCard } from "@/components/ai/AiInsightCard";
import { useAiAdvisor } from "@/hooks/useAiAdvisor";

export default function MenuPage() {
  const [filterPolls, setFilterPolls] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const { items, isLoading, fetchMenuItems, fetchCategories, subscribeToMenu, unsubscribeFromMenu } = useMenuStore();
  const { fetchRecipes } = useRecipesStore();
  const { fetchAssemblies } = useAssembliesStore();
  const { settings, fetchSettings, updateSettings } = useLandingSettingsStore();
  
  const ai = useAiAdvisor('menu');
  
  const [editingItem, setEditingItem] = useState<{isOpen: boolean, item: MenuItem | null}>({isOpen: false, item: null});

  useEffect(() => {
    fetchMenuItems();
    fetchCategories();
    fetchRecipes();
    fetchAssemblies();
    fetchSettings();
    subscribeToMenu();
    ai.fetchInsights();
    return () => unsubscribeFromMenu();
  }, [fetchMenuItems, fetchCategories, fetchRecipes, fetchAssemblies, fetchSettings, subscribeToMenu, unsubscribeFromMenu, ai.fetchInsights]);

  return (
    <div className="flex h-full flex-col">
      <AiInsightCard 
        module="menu" 
        insights={ai.insights} 
        isLoading={ai.isLoading} 
        onRefresh={ai.fetchInsights}
        className="mb-6 shrink-0" 
      />
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-white/10 mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Управление Меню</h1>
          <p className="text-sm text-muted-foreground mt-1">Ассортимент, цены и остатки</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-[#141414] border border-white/10 rounded-lg overflow-hidden shrink-0">
            <button 
              onClick={() => setFilterPolls(false)}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${!filterPolls ? 'bg-orange-500 text-white' : 'text-white/50 hover:bg-white/5'}`}
            >
              Основное
            </button>
            <button 
              onClick={() => setFilterPolls(true)}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${filterPolls ? 'bg-purple-500 text-white' : 'text-white/50 hover:bg-white/5'}`}
            >
              NPS Опросы
            </button>
          </div>

          <button onClick={() => setShowCategories(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-amber-500 hover:bg-white/10 text-sm font-semibold transition-colors">
            <FolderTree className="w-4 h-4" />
            Категории
          </button>
          
          <button 
            onClick={() => setEditingItem({isOpen: true, item: null})}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition-colors"
          >
            <Plus className="w-4 h-4" />
            Добавить
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto pb-10">
        {isLoading && items.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center w-full">
            <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin mb-4" />
            <p className="text-xl font-semibold text-gray-500">Загрузка меню...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center w-full">
            <FolderTree className="h-16 w-16 text-[#2A2A2A] mb-4" />
            <p className="text-xl font-semibold text-gray-500">Меню пусто</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.filter(i => (filterPolls ? i.isPoll : !i.isPoll) && !i.isPrep).map(item => (
              <MenuCard key={item.id} item={item} onEdit={() => setEditingItem({isOpen: true, item})} />
            ))}
          </div>
        )}
      </div>

      <MenuItemModal 
        isOpen={editingItem.isOpen} 
        onClose={() => setEditingItem({isOpen: false, item: null})} 
        item={editingItem.item} 
      />

      <MenuCategoriesModal 
        isOpen={showCategories}
        onClose={() => setShowCategories(false)}
      />
    </div>
  );
}

function MenuCard({ item, onEdit }: { item: MenuItem; onEdit: () => void }) {
  return (
    <div className="flex flex-col bg-[#141414] rounded-2xl border border-white/10 overflow-hidden group hover:border-white/20 transition-colors">
      {/* Image Header */}
      <div className="h-[140px] bg-white/5 relative flex items-center justify-center">
        {item.image ? (
          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <ImageIcon className="w-10 h-10 text-white/20" />
        )}
      </div>

      <div className="flex flex-col flex-1 p-4">
        <div className="flex items-start justify-between mb-1 gap-2">
          <h3 className="font-bold text-lg leading-tight line-clamp-1 flex-1">{item.name}</h3>
          {item.isPoll && (
            <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[10px] font-bold border border-purple-500/20 whitespace-nowrap shrink-0">
              ОПРОС
            </span>
          )}
        </div>
        
        {(() => {
          const { calculateRecipeCost, recipes } = useRecipesStore.getState();
          const { settings } = useLandingSettingsStore.getState();
          const targetMargin = settings?.target_margin || 65;
          const criticalFoodCost = settings?.critical_food_cost || 40;

          const recipe = recipes.find(r => r.id === item.recipeId);
          const totalCost = item.recipeId ? calculateRecipeCost(item.recipeId) : 0;
          const costPerPortion = recipe && recipe.portions > 0 ? totalCost / recipe.portions : totalCost;
          const salePrice = item.price || 0;
          const foodCostPercent = salePrice > 0 ? (costPerPortion / salePrice) * 100 : 0;
          const margin = salePrice > 0 ? ((salePrice - costPerPortion) / salePrice) * 100 : 0;

          const isMarginRisk = foodCostPercent > 0 && margin < targetMargin;

          return (
            <div className={`mb-3 p-2 rounded-xl border transition-all ${isMarginRisk ? 'bg-red-950/40 border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-white/5 border-white/5'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-extrabold text-orange-500 text-lg">{item.price} ₪</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-tight ${isMarginRisk ? 'bg-red-500 text-white animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-green-500/10 text-green-400'}`}>
                  {foodCostPercent > 0 ? `FC: ${foodCostPercent.toFixed(0)}%` : 'Нет ТТК'}
                </span>
              </div>
              
              {foodCostPercent > 0 && (
                <div className="flex flex-col gap-1 mt-1">
                  <div className="flex justify-between items-center text-[10px] text-white/40 uppercase font-medium">
                     <span>Себест: {costPerPortion.toFixed(2)} ₪</span>
                     <span className={isMarginRisk ? 'text-red-400 font-extrabold text-[11px]' : 'text-white/60'}>Маржа: {margin.toFixed(1)}%</span>
                  </div>
                  {isMarginRisk && (
                    <div className="text-[10px] text-red-400 font-bold bg-red-500/10 px-2 py-1 rounded w-full text-center uppercase tracking-wider border border-red-500/20">
                      ⚠️ Угроза маржи (&lt;{targetMargin}%)
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        <p className="text-xs text-white/50 line-clamp-2 mb-4 flex-1">
          {item.description || 'Нет описания'}
        </p>

        {/* Controls */}
        <div className="flex items-center justify-between border-t border-white/5 pt-3">
          <div className="flex items-center">
            <button 
              onClick={() => useMenuStore.getState().updateStock(item.id, Math.max(0, item.stock - 1))}
              className="p-1 rounded bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <div className="w-16 text-center text-sm font-bold text-cyan-400">
              {item.stock === 0 ? <span className="flex items-center justify-center gap-1"><Infinity className="w-3.5 h-3.5"/> Безлим</span> : `${item.stock} шт`}
            </div>
            <button 
              onClick={() => useMenuStore.getState().updateStock(item.id, item.stock + 1)}
              className="p-1 rounded bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <button 
            onClick={() => useMenuStore.getState().toggleActive(item.id, item.isActive)}
            className={`p-1 transition-colors ${item.isActive ? 'text-green-500 hover:text-green-400' : 'text-gray-600 hover:text-gray-500'}`}
          >
            {item.isActive ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
          </button>
        </div>
      </div>

      <button 
        onClick={onEdit}
        className="w-full py-3 text-xs font-bold text-white/70 bg-white/5 hover:bg-white/10 hover:text-white transition-colors border-t border-white/5"
      >
        Редактировать / Рецепт
      </button>
    </div>
  );
}
