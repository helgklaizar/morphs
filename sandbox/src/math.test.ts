import { describe, it, expect } from 'vitest';
import { add } from './math';

describe('Math functions', () => {
  it('должна корректно складывать числа', () => {
    expect(add(2, 2)).toBe(4);
    expect(add(10, 5)).toBe(15);
  });
});
