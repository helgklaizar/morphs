"use client";

import { useEffect, useState } from "react";
import { 
  Plus, 
  FolderTree, 
  Image as ImageIcon,
  Minus,
  Infinity,
  ToggleLeft,
  ToggleRight,
  ListOrdered,
  BookOpen,
  Package,
  Utensils,
  MessageSquare
} from "lucide-react";
import { Link } from "react-router-dom";

import { MenuSharedHeader } from "@/components/MenuSharedHeader";
import { useMenuQuery, useMenuSubscriptions, useUpdateMenuStockMutation, useToggleMenuActiveMutation, MenuItem } from '@rms/core';
import { MenuItemModal } from "./components/MenuItemModal";

export default function MenuPage() {
  const [filterPolls, setFilterPolls] = useState(false);
  const { data: items = [], isLoading } = useMenuQuery();
  useMenuSubscriptions();
  const [editingItem, setEditingItem] = useState<{isOpen: boolean, item: MenuItem | null}>({isOpen: false, item: null});

  return (
    <div className="flex h-full flex-col">
      <MenuSharedHeader filterPolls={filterPolls} onFilterPollsChange={setFilterPolls} />



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


    </div>
  );
}

function MenuCard({ item, onEdit }: { item: MenuItem; onEdit: () => void }) {
  const updateStockMut = useUpdateMenuStockMutation();
  const toggleActiveMut = useToggleMenuActiveMutation();

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
        <div className="flex items-start justify-between mb-2 gap-2">
          <h3 className="font-bold text-[19px] leading-tight line-clamp-2 flex-1">{item.name}</h3>
          <div className="flex flex-col items-end gap-1">
            <span className="font-black text-orange-500 text-[22px] shrink-0">{item.price} ₪</span>
            {Boolean(item.isPoll) && (
              <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[10px] font-bold border border-purple-500/20 whitespace-nowrap">
                ОПРОС
              </span>
            )}
          </div>
        </div>

        <p className="text-[15px] text-white/50 line-clamp-3 mb-6 flex-1 mt-1 leading-relaxed">
          {item.description || 'Нет описания'}
        </p>

        {/* Controls */}
        <div className="flex items-center justify-between border-t border-white/5 pt-4">
          <div className="flex items-center bg-white/5 rounded-xl p-1">
            <button 
              onClick={() => updateStockMut.mutate({ id: item.id, amount: Math.max(0, item.stock - 1) })}
              className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors"
            >
              <Minus className="w-5 h-5" />
            </button>
            <div className="w-20 px-2 text-center text-sm font-bold text-cyan-400">
              {item.stock === 0 ? <span className="flex items-center justify-center gap-1 text-xs"><Infinity className="w-4 h-4"/> Безлим</span> : `${item.stock} шт`}
            </div>
            <button 
              onClick={() => updateStockMut.mutate({ id: item.id, amount: item.stock + 1 })}
              className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <button 
            onClick={() => toggleActiveMut.mutate({ id: item.id, isActive: !item.isActive })}
            className={`flex items-center justify-center gap-2 px-4 h-[44px] rounded-xl transition-all font-bold tracking-wider uppercase text-[11px] min-w-[110px] ${
              item.isActive 
                ? 'text-white bg-emerald-600/80 hover:bg-emerald-500 shadow-lg' 
                : 'text-white/50 bg-white/5 hover:bg-white/10 border border-white/5'
            }`}
          >
            {item.isActive ? 'В Меню' : 'Скрыто'}
          </button>
        </div>
      </div>

      <button 
        onClick={onEdit}
        className="w-full py-3.5 text-sm font-bold text-white/70 bg-white/5 hover:bg-white/10 hover:text-white transition-colors border-t border-white/5 uppercase tracking-wider"
      >
        Редактировать / Рецепт
      </button>
    </div>
  );
}
