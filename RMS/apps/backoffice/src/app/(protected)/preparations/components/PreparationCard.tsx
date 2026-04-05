"use client";

import { useState } from 'react';
import { MenuItem, useMenuStore } from '@/store/useMenuStore';
import { ChefHat, AlertCircle, TrendingDown, Hammer } from 'lucide-react';
import { producePreparation } from '@/lib/repositories/production';

interface Props {
  prep: MenuItem;
}

export function PreparationCard({ prep }: Props) {
  const { fetchMenuItems } = useMenuStore();
  const [produceAmount, setProduceAmount] = useState('');
  const [isProducing, setIsProducing] = useState(false);

  // Status mapping
  const stock = prep.stock || 0;
  // TODO: Add critical tracking field in menu_items if needed? 
  // For now we assume low if stock < 20, critical if stock <= 5
  const isLow = stock > 0 && stock < 20;
  const isCritical = stock <= 5;
  const statusColor = isCritical ? 'text-red-400 bg-red-400/10 border-red-500/30' : isLow ? 'text-yellow-400 bg-yellow-400/10 border-yellow-500/30' : 'text-emerald-400 bg-emerald-400/10 border-emerald-500/30';

  const handleProduce = async () => {
    const amount = parseFloat(produceAmount);
    if (isNaN(amount) || amount <= 0) return;
    
    setIsProducing(true);
    try {
      if (!prep.recipeId) {
        alert("У этой заготовки нет привязанного рецепта!");
        return;
      }
      
      await producePreparation(prep.id, amount);
      await fetchMenuItems(); // Обновить остатки
      setProduceAmount('');
    } catch (err: any) {
      console.error(err);
      alert("Ошибка при варке: " + err.message);
    } finally {
      setIsProducing(false);
    }
  };

  return (
    <div className={`p-6 rounded-3xl bg-[#1a1a1a] border ${isCritical ? 'border-red-500/50' : 'border-white/5'} flex flex-col relative overflow-hidden group hover:border-white/20 transition-all`}>
      {/* Background Icon */}
      <ChefHat className="absolute -right-6 -bottom-6 w-32 h-32 text-white/[0.02] -rotate-12 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6" />
      
      {/* Header */}
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div>
          <h3 className="font-bold text-lg mb-1">{prep.name}</h3>
          <p className="text-xs text-white/40">{prep.kitchenDepartment || 'Без цеха'}</p>
        </div>
        <div className={`px-2.5 py-1 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${statusColor}`}>
          {isCritical && <AlertCircle className="w-3.5 h-3.5" />}
          {isLow && !isCritical && <TrendingDown className="w-3.5 h-3.5" />}
          Остаток: {stock} {prep.unit || 'шт'}
        </div>
      </div>

      <p className="text-sm text-white/50 mb-6 flex-1 relative z-10 line-clamp-2">
        {prep.description || 'Описание отсутствует'}
      </p>

      {/* Production Form */}
      <div className="flex gap-2 relative z-10 border-t border-white/5 pt-4">
        <input 
          type="number"
          placeholder={`Кол-во (${prep.unit || 'шт'})`}
          value={produceAmount}
          onChange={e => setProduceAmount(e.target.value)}
          className="w-24 bg-black border border-white/10 rounded-xl px-3 text-sm focus:outline-none focus:border-orange-500 transition-colors"
        />
        <button 
          onClick={handleProduce}
          disabled={!produceAmount || isProducing}
          className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-white/5 disabled:text-white/30 text-white font-bold py-2 rounded-xl text-sm transition-colors"
        >
          {isProducing ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Hammer className="w-4 h-4" />
              Сварить
            </>
          )}
        </button>
      </div>
    </div>
  );
}
