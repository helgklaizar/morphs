/**
 * Money Value Object
 * In RMS AI OS, all money calculations are done in integers (cents/kopecks).
 * Floating point math is strictly forbidden in the domain layer.
 */
export class Money {
  private constructor(public readonly amountInCents: number) {
    if (!Number.isInteger(amountInCents)) {
      throw new Error("Money amount must be a perfect integer (cents). Floating point arithmetic is forbidden.");
    }
  }

  static fromCents(cents: number): Money {
    return new Money(Math.round(cents)); // Safeguard
  }

  /**
   * Only for parsing external API responses or legacy data.
   * Prefer fromCents whenever possible.
   */
  static fromFloat(amount: number): Money {
    return new Money(Math.round(amount * 100));
  }

  getAmountInCents(): number {
    return this.amountInCents;
  }

  toFloat(): number {
    return this.amountInCents / 100;
  }

  add(other: Money): Money {
    return new Money(this.amountInCents + other.amountInCents);
  }

  subtract(other: Money): Money {
    return new Money(this.amountInCents - other.amountInCents);
  }

  multiply(multiplier: number): Money {
    return new Money(Math.round(this.amountInCents * multiplier));
  }

  isGreaterThan(other: Money): boolean {
    return this.amountInCents > other.amountInCents;
  }

  isLessThan(other: Money): boolean {
    return this.amountInCents < other.amountInCents;
  }

  equals(other: Money): boolean {
    return this.amountInCents === other.amountInCents;
  }
}
