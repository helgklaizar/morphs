import { describe, it, expect, vi } from 'vitest';
import { SuppliersRepository } from './suppliers';
import { pb } from '../pocketbase';

vi.mock('../pocketbase', () => ({
  pb: { collection: vi.fn() },
}));

describe('SuppliersRepository', () => {
  it('CRUD operations dispatch to PB correctly', async () => {
    const create = vi.fn();
    const update = vi.fn();
    const getFullList = vi.fn().mockResolvedValue([{ id: 's1' }]);
    const mockDel = vi.fn();

    vi.mocked(pb.collection).mockReturnValue({ create, update, getFullList, delete: mockDel } as any);

    const full = await SuppliersRepository.fetchAll();
    expect(full[0].id).toBe('s1');

    await SuppliersRepository.add({ name: 'Sup1' });
    expect(create).toHaveBeenCalledWith({ name: 'Sup1' });

    await SuppliersRepository.update('s1', { notes: 'test' });
    expect(update).toHaveBeenCalledWith('s1', { notes: 'test' });

    await SuppliersRepository.delete('s2');
    expect(mockDel).toHaveBeenCalledWith('s2');
  });
});
