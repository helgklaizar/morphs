export class Ingredient {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly costPerUnitCents: number,
    public readonly unit: 'kg' | 'l' | 'pcs',
  ) {}
}
