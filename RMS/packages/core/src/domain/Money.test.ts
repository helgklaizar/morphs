import { describe, it, expect } from 'vitest';
import { Money } from './Money';

describe('Money Value Object', () => {
    it('creates from cents', () => {
        const money = Money.fromCents(100);
        expect(money.getAmountInCents()).toBe(100);
    });

    it('creates from float', () => {
        const money = Money.fromFloat(12.34);
        expect(money.getAmountInCents()).toBe(1234);
    });

    it('adds two amounts', () => {
        const money = Money.fromCents(100).add(Money.fromCents(50));
        expect(money.getAmountInCents()).toBe(150);
    });

    it('subtracts two amounts', () => {
        const money = Money.fromCents(100).subtract(Money.fromCents(50));
        expect(money.getAmountInCents()).toBe(50);
    });

    it('multiplies correctly keeping integer precision', () => {
        const money = Money.fromCents(100).multiply(1.5);
        expect(money.getAmountInCents()).toBe(150);
    });

    it('throws error if instantiated with float', () => {
        expect(() => {
            // @ts-ignore testing internal fail
            new (Money as any)(100.5);
        }).toThrow();
    });
});
