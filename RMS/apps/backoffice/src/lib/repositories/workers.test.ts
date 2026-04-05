import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkersRepository } from './workers';
import { pb } from '../pocketbase';

vi.mock('../pocketbase', () => ({
  pb: {
    collection: vi.fn(),
  },
}));

describe('WorkersRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchAll() should return mapped workers', async () => {
    const mockRecords = [{
      id: 'w1', name: 'Ivan', role: 'cook', hourly_rate: 15, phone: '123', status: 'active', created: 'date', updated: 'date'
    }];
    const getFullList = vi.fn().mockResolvedValue(mockRecords);
    vi.mocked(pb.collection).mockReturnValue({ getFullList } as any);

    const result = await WorkersRepository.fetchAll();
    expect(result[0]).toEqual({
      id: 'w1', name: 'Ivan', role: 'cook', hourly_rate: 15, phone: '123', status: 'active', created: 'date', updated: 'date'
    });
  });

  it('add() should format payload correctly', async () => {
    const create = vi.fn();
    vi.mocked(pb.collection).mockReturnValue({ create } as any);

    await WorkersRepository.add({ name: 'Maria', status: 'inactive' });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Maria', status: 'inactive' }));
  });

  it('update() should only update provided fields', async () => {
    const update = vi.fn();
    vi.mocked(pb.collection).mockReturnValue({ update } as any);

    await WorkersRepository.update('w2', { name: 'Bob' });
    expect(update).toHaveBeenCalledWith('w2', { name: 'Bob' });
  });

  it('delete() should drop worker by id', async () => {
    const mockDelete = vi.fn();
    vi.mocked(pb.collection).mockReturnValue({ delete: mockDelete } as any);

    await WorkersRepository.delete('w3');
    expect(mockDelete).toHaveBeenCalledWith('w3');
  });
});
