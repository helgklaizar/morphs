import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClientsRepository } from './clients';
import { pb } from '../pocketbase';

vi.mock('../pocketbase', () => ({
  pb: {
    collection: vi.fn(),
    filter: vi.fn((query) => query)
  },
}));

describe('ClientsRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchAll() should return clients', async () => {
    const getFullList = vi.fn().mockResolvedValue([{ id: 'cl1', name: 'Al', orders_count: null }]);
    vi.mocked(pb.collection).mockReturnValue({ getFullList } as any);

    const result = await ClientsRepository.fetchAll();
    expect(result[0].orders_count).toBe(0);
  });

  it('getById() should return single client', async () => {
    const getOne = vi.fn().mockResolvedValue({ id: 'cl2' });
    vi.mocked(pb.collection).mockReturnValue({ getOne } as any);

    const result = await ClientsRepository.getById('cl2');
    expect(result.id).toBe('cl2');
  });

  it('add() and update() should call pocketbase with right args', async () => {
    const create = vi.fn();
    const update = vi.fn();
    vi.mocked(pb.collection).mockReturnValue({ create, update } as any);

    await ClientsRepository.add({ name: 'Bob' });
    expect(create).toHaveBeenCalledWith({ name: 'Bob' });

    await ClientsRepository.update('cl3', { name: 'Rob' });
    expect(update).toHaveBeenCalledWith('cl3', { name: 'Rob' });
  });

  it('delete() should just delete client if no phone', async () => {
    const getOne = vi.fn().mockResolvedValue({ id: 'cl4' }); // No phone
    const mockDelete = vi.fn();
    vi.mocked(pb.collection).mockReturnValue({ getOne, delete: mockDelete } as any);

    await ClientsRepository.delete('cl4');
    expect(mockDelete).toHaveBeenCalledWith('cl4');
  });

  it('delete() should delete orders and items if phone exists', async () => {
    const getOne = vi.fn().mockResolvedValue({ id: 'cl5', phone: '123' });
    const getFullList = vi.fn()
      .mockResolvedValueOnce([{ id: 'ord1' }]) // Orders
      .mockResolvedValueOnce([{ id: 'itm1' }]); // Order Items
    
    // We need to handle sequential getFullList properly depending on the implementation!
    // But this simple mock will just return the array.
    const mockDelete = vi.fn();

    vi.mocked(pb.collection).mockReturnValue({ 
      getOne, 
      getFullList, 
      delete: mockDelete 
    } as any);

    await ClientsRepository.delete('cl5');
    
    // Should have deleted: item1, ord1, and cl5
    expect(mockDelete).toHaveBeenCalledWith('itm1');
    expect(mockDelete).toHaveBeenCalledWith('ord1');
    expect(mockDelete).toHaveBeenCalledWith('cl5');
  });
});
