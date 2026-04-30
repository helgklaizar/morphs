import { describe, it, expect, vi } from 'vitest';
import { LocalOrdersRepository } from './localOrders';
import { getDb } from '@rms/db-local';
import { Order } from '@/store/useOrdersStore';

vi.mock('@rms/db-local', () => ({
  getDb: vi.fn()
}));

describe('LocalOrdersRepository', () => {
  it('updateFull() should execute correct SQL queries', async () => {
    const mockExecute = vi.fn();
    vi.mocked(getDb).mockResolvedValue({ execute: mockExecute } as any);

    const order: Order = {
      id: 'ord123',
      customerName: 'Ivan',
      customerPhone: '1234',
      paymentMethod: 'card',
      totalAmount: 100,
      createdAt: 'date',
      status: 'pending',
      reservationDate: '',
      isArchived: false,
      items: [
        { id: 'itm1', menuItemName: 'Food', quantity: 2, priceAtTime: 50, menuItemId: 'm1' }
      ]
    };

    await LocalOrdersRepository.updateFull(order);

    expect(mockExecute).toHaveBeenCalledTimes(3); 
    // 1st: update orders
    expect(mockExecute).toHaveBeenNthCalledWith(1, expect.stringContaining('UPDATE orders'), expect.any(Array));
    // 2nd: drop items
    expect(mockExecute).toHaveBeenNthCalledWith(2, expect.stringContaining("UPDATE order_items SET sync_status='pending_delete'"), ['ord123']);
    // 3rd: insert new item
    expect(mockExecute).toHaveBeenNthCalledWith(3, expect.stringContaining('INSERT INTO order_items'), expect.any(Array));
  });
});
