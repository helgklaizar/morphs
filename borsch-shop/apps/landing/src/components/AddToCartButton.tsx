"use client";

import { useCartStore, CartItem } from "@/store/cartStore";
import { useState } from "react";
import { useLocaleStore, translateKey } from "@/store/localeStore";

interface Particle {
  id: number;
  startX: number;
  startY: number;
  dx: number;
  dy: number;
}

export default function AddToCartButton({ item }: { item: CartItem & { stock?: number; is_poll?: boolean } }) {
  const { items, addItem, increment, decrement } = useCartStore();
  const [particles, setParticles] = useState<Particle[]>([]);
  const localeState = useLocaleStore();
  const t = (key: string, fb: string) => translateKey(localeState, key, fb);
  
  const cartItem = items.find((i) => i.id === item.id);
  const inCart = cartItem ? cartItem.quantity : 0;

  const triggerAnimation = (e: React.MouseEvent) => {
    // Optional haptic feedback
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(40);
    }
    const startX = e.clientX;
    const startY = e.clientY;
    
    // We want the particle to fly towards the bottom center of the screen
    // where the floating cart is placed
    const endX = typeof window !== "undefined" ? window.innerWidth / 2 : 200;
    const endY = typeof window !== "undefined" ? window.innerHeight - 30 : 800;
    
    const dx = endX - startX;
    const dy = endY - startY;
    
    const id = Date.now();
    setParticles((p) => [...p, { id, startX, startY, dx, dy }]);
    
    setTimeout(() => {
      setParticles((p) => p.filter((part) => part.id !== id));
    }, 700);
  };

  const handleAdd = (e: React.MouseEvent) => {
    triggerAnimation(e);
    addItem(item);
  };

  const handleIncrement = (e: React.MouseEvent) => {
    triggerAnimation(e);
    increment(item.id);
  };

  const isOutOfStock = item.stock === 0;

  return (
    <>
      {particles.map((p) => (
        <div
          key={p.id}
          className="fixed w-7 h-7 bg-gradient-to-r from-[#FF6B00] to-[#FF8C38] rounded-full z-[99999] pointer-events-none drop-shadow-[0_4px_12px_rgba(255,107,0,0.6)] animate-flyToCart flex items-center justify-center text-white font-bold text-[14px]"
          style={{
            left: p.startX - 14,
            top: p.startY - 14,
            "--dx": `${p.dx}px`,
            "--dy": `${p.dy}px`,
          } as React.CSSProperties}
        >
          1
        </div>
      ))}
      
      {inCart > 0 ? (
        <div className="flex h-[42px] bg-[#1E1E1E] rounded-[14px] border border-white/10 overflow-hidden shadow-inner font-semibold">
          <button 
            onClick={() => {
              if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(20);
              decrement(item.id);
            }} 
            className="px-4 h-full flex items-center justify-center text-white/80 hover:bg-white/10 hover:text-white transition active:scale-95"
          >
            <span className="text-[18px]">−</span>
          </button>
          <div className="flex-1 flex items-center justify-center border-x border-white/5 bg-[#141414]">
            <span className="text-[14px] font-[700] text-white tracking-wide">{inCart} {t('pieces', 'шт')}</span>
          </div>
          <button 
            onClick={handleIncrement} 
            className="px-4 h-full flex items-center justify-center bg-gradient-to-r from-[#FF6B00] to-[#FF8C38] text-white transition rounded-none active:scale-95"
          >
            <span className="text-[18px]">+</span>
          </button>
        </div>
      ) : (
        <button
          onClick={handleAdd}
          disabled={isOutOfStock}
          className={`w-full py-[11px] rounded-[14px] font-[700] shadow-sm flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
            !isOutOfStock
              ? "bg-gradient-to-r from-[#FF6B00] to-[#FF8C38] text-white shadow-[0_4px_16px_rgba(255,107,0,0.3)]"
              : "bg-white/5 text-white/30 cursor-not-allowed border-transparent"
          }`}
        >
          {!isOutOfStock && <span className="text-[18px] leading-none mb-[1px] text-white">+</span>}
          <span className="text-[14px]">{!isOutOfStock ? t('add_to_cart', 'В корзину') : t('out_of_stock_btn', 'Нет в наличии')}</span>
        </button>
      )}
    </>
  );
}
