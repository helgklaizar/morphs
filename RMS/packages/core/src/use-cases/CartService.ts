import { Order } from '../domain/Order';
import { CartItem } from '../domain/CartItem';
import { Money } from '../domain/Money';

export class CartService {
  private currentOrder: Order | null = null;

  startNewOrder(orderId: string): Order {
    this.currentOrder = new Order(orderId);
    return this.currentOrder;
  }

  addProductToOrder(productId: string, name: string, priceInCents: number, quantity: number = 1): void {
    if (!this.currentOrder) {
      throw new Error('No active order. Call startNewOrder first.');
    }
    const item = new CartItem(crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(), productId, name, Money.fromCents(priceInCents), quantity);
    this.currentOrder.addItem(item);
  }

  getCurrentOrderTotal(): Money {
    if (!this.currentOrder) return Money.fromCents(0);
    return this.currentOrder.getTotal();
  }

  getCurrentOrder(): Order | null {
    return this.currentOrder;
  }
}
