"use client";

import { useEffect, useState } from 'react';
import { useMenuStore } from '@/store/useMenuStore';
import { PreparationCard } from './components/PreparationCard';
import { Plus, Search } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

import { PreparationModal } from './components/PreparationModal';
import { MenuItem } from '@/store/useMenuStore';

export default function PreparationsPage() {
  const { items, fetchMenuItems, subscribeToMenu, unsubscribeFromMenu, isLoading } = useMenuStore();
  const [search, setSearch] = useState('');
  const [editingItem, setEditingItem] = useState<{isOpen: boolean, item: MenuItem | null}>({isOpen: false, item: null});

  useEffect(() => {
    fetchMenuItems();
    subscribeToMenu();
    return () => unsubscribeFromMenu();
  }, [fetchMenuItems, subscribeToMenu, unsubscribeFromMenu]);

  const preparations = items.filter(i => i.isPrep);
  const filtered = preparations.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-8 h-full flex flex-col pt-12 relative max-w-6xl mx-auto w-full">
      <div className="flex justify-between items-end mb-8 relative z-10 w-full pl-12 lg:pl-0">
        <div>
          <h1 className="text-4xl font-black tracking-tighter mix-blend-difference mb-2">ЗАГОТОВКИ</h1>
          <p className="text-white/40 font-medium tracking-wide text-sm flex items-center gap-2">
            Производство полуфабрикатов
            <span className="bg-white/10 px-2 py-0.5 rounded-full text-[10px] text-white/50">{preparations.length}</span>
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white/70 transition-colors" />
            <input 
              type="text"
              placeholder="Поиск..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-black border border-white/10 rounded-2xl py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-white/30 transition-all w-64"
            />
          </div>
          <button 
            onClick={() => setEditingItem({isOpen: true, item: null})}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition-colors"
          >
            <Plus className="w-4 h-4" />
            Создать
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-x-hidden overflow-y-auto no-scrollbar pb-32">
        {isLoading && items.length === 0 ? (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse">
             {[1,2,3,4].map(i => (
               <div key={i} className="h-48 bg-white/5 rounded-3xl border border-white/5" />
             ))}
           </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center mt-20 border border-dashed border-white/10 rounded-3xl bg-white/[0.02]">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center mb-4 border border-white/5">
              <Plus className="w-8 h-8 text-white/30" />
            </div>
            <p className="text-white/50 font-medium max-w-sm">
               Заготовок не найдено. Создать заготовку можно в Меню, отметив чекбокс "Это Заготовка".
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence>
              {filtered.map(prep => (
                <motion.div
                  key={prep.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <PreparationCard prep={prep} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <PreparationModal 
        isOpen={editingItem.isOpen}
        onClose={() => setEditingItem({ isOpen: false, item: null })}
        item={editingItem.item}
      />
    </div>
  );
}
