import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HistoryRepository } from './history';
import { pb } from '../pocketbase';

vi.mock('../pocketbase', () => ({
  pb: {
    collection: vi.fn(),
  },
}));

describe('HistoryRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchHistory() should return empty array if no records', async () => {
    const getFullList = vi.fn().mockResolvedValue([]);
    vi.mocked(pb.collection).mockReturnValue({ getFullList } as any);

    const result = await HistoryRepository.fetchHistory();
    expect(result).toEqual([]);
  });

  it('fetchHistory() should join orders and items', async () => {
    const getFullList = vi.fn()
      .mockResolvedValueOnce([{ id: 'ord1', customer_name: 'Ivan', is_archived: 1 }]) // Orders
      .mockResolvedValueOnce([{ id: 'itm1', order_id: 'ord1', menu_item_name: 'RMS' }]); // Items

    vi.mocked(pb.collection).mockReturnValue({ getFullList } as any);

    const result = await HistoryRepository.fetchHistory();
    expect(result[0].customerName).toBe('Ivan');
    expect(result[0].isArchived).toBe(true);
    expect(result[0].items[0].menuItemName).toBe('RMS');
  });
});
