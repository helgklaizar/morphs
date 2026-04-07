import { create } from 'zustand';

interface CartItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  menuItemId: string;
}

interface CartState {
  items: CartItem[];
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  paymentMethod: string;
  orderType: 'dine_in' | 'pickup' | 'delivery' | 'preorder';
  wantsBread: boolean;
  wantsCutlery: boolean;
  reservationDate: string | null;
  addToCart: (item: Omit<CartItem, 'quantity'>) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  setCustomer: (name: string, phone: string, address?: string) => void;
  setOrderType: (type: 'dine_in' | 'pickup' | 'delivery' | 'preorder') => void;
  toggleBread: () => void;
  toggleCutlery: () => void;
  setPaymentMethod: (method: string) => void;
  setReservationDate: (date: string | null) => void;
  getTotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  customerName: '',
  customerPhone: '',
  customerAddress: '',
  paymentMethod: 'cash',
  orderType: 'dine_in',
  wantsBread: false,
  wantsCutlery: false,
  reservationDate: null,

  addToCart: (item) => {
    const existing = get().items.find(i => i.id === item.id);
    if (existing) {
      set({
        items: get().items.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)
      });
    } else {
      set({ items: [...get().items, { ...item, quantity: 1 }] });
    }
  },

  removeFromCart: (id) => {
    set({ items: get().items.filter(i => i.id !== id) });
  },

  updateQuantity: (id, delta) => {
    const items = get().items.map(i => {
      if (i.id === id) {
        const newQty = Math.max(0, i.quantity + delta);
        return { ...i, quantity: newQty };
      }
      return i;
    }).filter(i => i.quantity > 0);
    set({ items });
  },

  clearCart: () => set({ 
    items: [], 
    customerName: '', 
    customerPhone: '', 
    customerAddress: '',
    paymentMethod: 'cash', 
    orderType: 'dine_in',
    wantsBread: false,
    wantsCutlery: false,
    reservationDate: null 
  }),

  setCustomer: (name, phone, address = '') => set({ customerName: name, customerPhone: phone, customerAddress: address }),
  setOrderType: (orderType) => set({ orderType }),
  toggleBread: () => set({ wantsBread: !get().wantsBread }),
  toggleCutlery: () => set({ wantsCutlery: !get().wantsCutlery }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  setReservationDate: (reservationDate) => set({ reservationDate }),

  getTotal: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
}));
