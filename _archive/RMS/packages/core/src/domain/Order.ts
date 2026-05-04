import { CartItem } from './CartItem';
import { Money } from './Money';

export class Order {
  constructor(
    public readonly id: string,
    private items: CartItem[] = []
  ) {}

  addItem(item: CartItem): void {
    const existing = this.items.find(i => i.productId === item.productId);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      this.items.push(item);
    }
  }

  removeItem(productId: string): void {
    this.items = this.items.filter(i => i.productId !== productId);
  }

  getItems(): CartItem[] {
    return [...this.items];
  }

  getTotal(): Money {
    return this.items.reduce((total, item) => {
      return total.add(item.getTotalPrice());
    }, Money.fromCents(0));
  }
}
