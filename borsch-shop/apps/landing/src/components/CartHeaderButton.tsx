"use client";

import { useCartStore } from "@/store/cartStore";
import { ShoppingBag } from "lucide-react";

export default function CartHeaderButton() {
  const { items, toggleCart } = useCartStore();
  
  const totalItems = items.reduce((acc, i) => acc + i.quantity, 0);

  return (
    <button
      onClick={toggleCart}
      className="relative flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 transition px-5 py-2.5 rounded-full font-bold shadow-lg shadow-neutral-900 border border-white/5 group"
    >
      <ShoppingBag className="w-5 h-5 text-neutral-300 group-hover:text-white transition-colors" />
      <span className="text-sm">Корзина</span>
      {totalItems > 0 && (
        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[11px] text-white font-extrabold shadow shadow-rose-500/50">
          {totalItems}
        </span>
      )}
    </button>
  );
}
