"use client";

import { Link, useLocation } from "react-router-dom";
import { Plus, FolderTree, ListOrdered, BookOpen, Package, Utensils, MessageSquare } from "lucide-react";
import { useState } from "react";
import { MenuItemModal } from "@/pages/menu/components/MenuItemModal";
import { MenuCategoriesModal } from "@/pages/menu/components/MenuCategoriesModal";

interface MenuHeaderProps {
  filterPolls?: boolean;
  onFilterPollsChange?: (polls: boolean) => void;
}

// Defines the exact shared header from the Menu page
export function MenuSharedHeader({ filterPolls, onFilterPollsChange }: MenuHeaderProps = {}) {
  const { pathname } = useLocation();
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);

  const isMenu = pathname === "/menu";
  const isRecipes = pathname === "/recipes";
  const isInventory = pathname === "/inventory";
  const isPurchases = pathname === "/purchases";

  const handleMenuClick = (e: React.MouseEvent, isPollsTab: boolean) => {
    if (isMenu && onFilterPollsChange) {
      e.preventDefault();
      onFilterPollsChange(isPollsTab);
    }
  };

  const isMainActive = isMenu && !filterPolls;
  const isPollsActive = isMenu && filterPolls;

  return (
    <>
      <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5 shrink-0 gap-4 flex-wrap mt-0">
        <div className="flex items-center gap-6">
          <h1 className="text-3xl lg:text-4xl font-black tracking-tighter uppercase bg-gradient-to-r from-white to-white/50 bg-clip-text text-transparent">Меню</h1>
          
          {/* THE LEFT BOX - MUST NOT CHANGE */}
          <div className="flex flex-wrap items-center gap-2">
            <Link 
              to="/menu"
              onClick={(e) => handleMenuClick(e, false)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] md:text-[13px] font-bold uppercase tracking-wider transition-all border ${isMainActive ? 'bg-white/10 text-white shadow-lg border-white/10' : 'border-transparent text-white/40 hover:text-white/80 hover:bg-white/5 bg-transparent'}`}
            >
              <Utensils className="w-4 h-4 shrink-0" />
              <span className="hidden md:inline">Основное</span>
            </Link>
            
            <Link 
              to="/menu"
              onClick={(e) => handleMenuClick(e, true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] md:text-[13px] font-bold uppercase tracking-wider transition-all border ${isPollsActive ? 'bg-white/10 text-white shadow-lg border-white/10' : 'border-transparent text-white/40 hover:text-white/80 hover:bg-white/5 bg-transparent'}`}
            >
              <MessageSquare className="w-4 h-4 shrink-0" />
              <span className="hidden md:inline">Опросы</span>
            </Link>

            <button onClick={() => setIsCategoryModalOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] md:text-[13px] font-bold uppercase tracking-wider transition-all border border-transparent text-white/40 hover:text-white/80 hover:bg-white/5 bg-transparent">
              <FolderTree className="w-4 h-4 shrink-0" />
              <span className="hidden md:inline">Категории</span>
            </button>
            
            <button 
              onClick={() => setIsItemModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] md:text-[13px] font-bold uppercase tracking-wider transition-all border border-transparent text-white/40 hover:text-white/80 hover:bg-white/5 bg-transparent"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span className="hidden md:inline">Добавить</span>
            </button>
          </div>
        </div>
        
        {/* THE RIGHT BOX - HIGHLIGHTS ACTIVE ROUTE */}
        <div className="flex flex-wrap items-center gap-2">
          <Link 
            to="/recipes" 
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] md:text-[13px] font-bold uppercase tracking-wider transition-all border ${isRecipes ? 'bg-white/10 text-white shadow-lg border-white/10' : 'border-transparent text-white/40 hover:text-white/80 hover:bg-white/5 bg-transparent'}`}
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            Рецепты
          </Link>
          <Link 
            to="/inventory" 
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] md:text-[13px] font-bold uppercase tracking-wider transition-all border ${isInventory ? 'bg-white/10 text-white shadow-lg border-white/10' : 'border-transparent text-white/40 hover:text-white/80 hover:bg-white/5 bg-transparent'}`}
          >
            <Package className="w-4 h-4 shrink-0" />
            Склад
          </Link>
          <Link 
            to="/purchases" 
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] md:text-[13px] font-bold uppercase tracking-wider transition-all border ${isPurchases ? 'bg-white/10 text-white shadow-lg border-white/10' : 'border-transparent text-white/40 hover:text-white/80 hover:bg-white/5 bg-transparent'}`}
          >
            <ListOrdered className="w-4 h-4 shrink-0" />
            Закупки
          </Link>
        </div>
      </div>

      <MenuItemModal isOpen={isItemModalOpen} onClose={() => setIsItemModalOpen(false)} item={null} />
      <MenuCategoriesModal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} />
    </>
  );
}
