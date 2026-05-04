import { describe, it, expect, vi } from 'vitest';
import { StocktakesRepository } from './stocktakes';
import { pb } from '../pocketbase';

vi.mock('../pocketbase', () => ({
  pb: { collection: vi.fn() },
}));

describe('StocktakesRepository', () => {
  it('fetchAll() gets list', async () => {
    const getList = vi.fn().mockResolvedValue([{ id: 'st1' }]);
    vi.mocked(pb.collection).mockReturnValue({ getFullList: getList } as any);
    const res = await StocktakesRepository.fetchAll();
    expect(res[0].id).toBe('st1');
  });

  it('create() adds items and updates inventory quantity', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'new_hdr' });
    const update = vi.fn();
    vi.mocked(pb.collection).mockReturnValue({ create, update } as any);

    await StocktakesRepository.create([
      { inventory_item_id: 'inv1', actual_quantity: 10 }
    ]);

    // Header created
    expect(create).toHaveBeenNthCalledWith(1, expect.objectContaining({ status: 'completed' }));
    
    // Item created
    expect(create).toHaveBeenNthCalledWith(2, expect.objectContaining({
       stocktake_id: 'new_hdr',
       inventory_item_id: 'inv1'
    }));

    // Inventory updated
    expect(update).toHaveBeenCalledWith('inv1', { quantity: 10 });
  });
});
