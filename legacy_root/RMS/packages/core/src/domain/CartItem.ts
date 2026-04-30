import { Money } from './Money';

export class CartItem {
  constructor(
    public readonly id: string,
    public readonly productId: string,
    public readonly name: string,
    public readonly basePrice: Money,
    public quantity: number = 1
  ) {}

  getTotalPrice(): Money {
    return this.basePrice.multiply(this.quantity);
  }
}
