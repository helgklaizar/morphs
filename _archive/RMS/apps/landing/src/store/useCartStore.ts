import { create } from "zustand";
import { useLocaleStore, translateKey } from "./localeStore";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image_url: string;
  quantity: number;
  stock: number;
  is_poll?: boolean;
}

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  reservationDateOffset: number;
  setReservationDateOffset: (offset: number) => void;
  addItem: (product: CartItem) => void;
  removeItem: (id: string) => void;
  increment: (id: string) => void;
  decrement: (id: string) => void;
  clearCart: () => void;
  toggleCart: () => void;
  setIsOpen: (isOpen: boolean) => void;
  getTotalPrice: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  isOpen: false,
  reservationDateOffset: 0,
  setReservationDateOffset: (o) => set({ reservationDateOffset: o }),
  
  addItem: (product) => {
    set((state) => {
      const existing = state.items.find((i) => i.id === product.id);
      
      if (existing) {
        if (state.reservationDateOffset === 0 && existing.quantity >= product.stock) {
          alert(translateKey(useLocaleStore.getState(), 'max_portions', "Максимальное количество порций на сегодня. Выберите другую дату в корзине."));
          return { items: state.items };
        }
        return {
          items: state.items.map((i) =>
            i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
          )
        };
      }

      if (state.reservationDateOffset === 0 && product.stock <= 0) {
          alert(translateKey(useLocaleStore.getState(), 'out_of_stock_alert', "Нет в наличии на сегодня. Выберите другую дату в корзине."));
          return { items: state.items };
      }

      return {
        items: [
          ...state.items,
          {
            id: product.id,
            name: product.name,
            price: product.price,
            image_url: product.image_url,
            quantity: 1,
            stock: product.stock,
            is_poll: product.is_poll,
          },
        ]
      };
    });
  },

  removeItem: (id) =>
    set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

  increment: (id) =>
    set((state) => {
      const existing = state.items.find((i) => i.id === id);
      if (existing && state.reservationDateOffset === 0 && existing.quantity >= existing.stock) {
        alert(translateKey(useLocaleStore.getState(), 'max_portions', "Максимальное количество порций на сегодня. Выберите другую дату в корзине."));
        return { items: state.items };
      }
      return {
        items: state.items.map((i) =>
          i.id === id ? { ...i, quantity: i.quantity + 1 } : i
        ),
      };
    }),

  decrement: (id) =>
    set((state) => {
      const existing = state.items.find((i) => i.id === id);
      if (existing?.quantity === 1) {
        return { items: state.items.filter((i) => i.id !== id) };
      }
      return {
        items: state.items.map((i) =>
          i.id === id ? { ...i, quantity: i.quantity - 1 } : i
        ),
      };
    }),

  clearCart: () => set({ items: [] }),
  
  toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
  setIsOpen: (isOpen) => set({ isOpen }),
  
  getTotalPrice: () => {
    return get().items.reduce((total, item) => total + item.price * item.quantity, 0);
  },
}));
