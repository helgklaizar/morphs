import { describe, it, expect, vi } from 'vitest';
import { WasteRepository } from './waste';
import { pb } from '../pocketbase';

vi.mock('../pocketbase', () => ({
  pb: { collection: vi.fn() },
}));

describe('WasteRepository', () => {
  it('fetchAll() loads waste records', async () => {
    const getList = vi.fn().mockResolvedValue([{ id: 'w1' }]);
    vi.mocked(pb.collection).mockReturnValue({ getFullList: getList } as any);
    
    const res = await WasteRepository.fetchAll();
    expect(res).toEqual([{ id: 'w1' }]);
  });

  it('addWaste() decreases inventory quantity', async () => {
    const create = vi.fn();
    const getOne = vi.fn().mockResolvedValue({ quantity: 10 });
    const update = vi.fn();
    vi.mocked(pb.collection).mockReturnValue({ create, getOne, update } as any);

    await WasteRepository.addWaste({
      inventory_item_id: 'inv1',
      quantity: 3,
      reason: 'Spoiled'
    });

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ reason: 'Spoiled' }));
    expect(getOne).toHaveBeenCalledWith('inv1');
    expect(update).toHaveBeenCalledWith('inv1', { quantity: 7 }); // 10 - 3
  });
});
