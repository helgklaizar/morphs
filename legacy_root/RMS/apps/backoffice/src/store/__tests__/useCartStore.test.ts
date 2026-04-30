import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from '../useCartStore';

describe('useCartStore', () => {
  beforeEach(() => {
    useCartStore.getState().clearCart();
  });

  it('addToCart should add to cart and update total', () => {
    const item = { id: 'm1', name: 'Борщ', price: 30, menuItemId: 'm1' };
    useCartStore.getState().addToCart(item);

    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].quantity).toBe(1);
    expect(useCartStore.getState().getTotal()).toBe(30);
  });

  it('updateQuantity should work', () => {
    const item = { id: 'm1', name: 'Борщ', price: 30, menuItemId: 'm1' };
    useCartStore.getState().addToCart(item);
    useCartStore.getState().updateQuantity('m1', 2);

    expect(useCartStore.getState().items[0].quantity).toBe(3);
  });

  it('clearCart should work', () => {
    const item = { id: 'm1', name: 'Борщ', price: 30, menuItemId: 'm1' };
    useCartStore.getState().addToCart(item);
    useCartStore.getState().clearCart();

    expect(useCartStore.getState().items).toHaveLength(0);
    expect(useCartStore.getState().getTotal()).toBe(0);
  });
});
