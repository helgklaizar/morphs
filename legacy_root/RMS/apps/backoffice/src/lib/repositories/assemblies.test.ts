import { describe, it, expect, vi } from 'vitest';
import { AssembliesRepository } from './assemblies';
import { pb } from '../pocketbase';

vi.mock('../pocketbase', () => ({
  pb: {
    collection: vi.fn(),
    filter: vi.fn((query) => query),
    autoCancellation: vi.fn()
  },
}));

describe('AssembliesRepository', () => {
  it('fetchAll() should calculate cost correctly', async () => {
    const mockRecords = [{
      id: 'asm1',
      name: 'Burger Kit',
      expand: {
        'assembly_items(assembly_id)': [
          {
            id: 'ai1',
            quantity: 2,
            inventory_item_id: 'inv1',
            expand: {
              inventory_item_id: { name: 'Bun', price: 10 }
            }
          }
        ]
      }
    }];
    
    vi.mocked(pb.collection).mockReturnValue({
      getFullList: vi.fn().mockResolvedValue(mockRecords)
    } as any);

    const result = await AssembliesRepository.fetchAll();
    expect(result[0].totalCost).toBe(20);
    expect(result[0].items[0].name).toBe('Bun');
  });

  it('add() creates assembly and items', async () => {
    const mockCreate = vi.fn().mockResolvedValue({ id: 'asm2' });
    vi.mocked(pb.collection).mockReturnValue({ create: mockCreate } as any);

    await AssembliesRepository.add('Salad Kit', [{ inventoryItemId: 'inv2', quantity: 5 }]);
    
    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(mockCreate).toHaveBeenNthCalledWith(1, { name: 'Salad Kit' });
    expect(mockCreate).toHaveBeenNthCalledWith(2, { assembly_id: 'asm2', inventory_item_id: 'inv2', quantity: 5 });
  });

  it('update() replaces old items', async () => {
    const mockUpdate = vi.fn();
    const mockGetList = vi.fn().mockResolvedValue([{ id: 'old_item' }]);
    const mockDelete = vi.fn();
    const mockCreate = vi.fn();

    vi.mocked(pb.collection).mockReturnValue({
      update: mockUpdate,
      getFullList: mockGetList,
      delete: mockDelete,
      create: mockCreate
    } as any);

    await AssembliesRepository.update('asm3', 'New Kit', [{ inventoryItemId: 'inv3', quantity: 1 }]);

    expect(mockUpdate).toHaveBeenCalledWith('asm3', { name: 'New Kit' });
    expect(mockDelete).toHaveBeenCalledWith('old_item');
    expect(mockCreate).toHaveBeenCalledWith({ assembly_id: 'asm3', inventory_item_id: 'inv3', quantity: 1 });
  });

  it('delete() drops assembly', async () => {
    const mockDel = vi.fn();
    vi.mocked(pb.collection).mockReturnValue({ delete: mockDel } as any);
    await AssembliesRepository.delete('asm_del');
    expect(mockDel).toHaveBeenCalledWith('asm_del');
  });
});
