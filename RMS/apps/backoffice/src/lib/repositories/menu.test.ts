import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MenuRepository } from './menu';
import { pb } from '../pocketbase';

vi.mock('../pocketbase', () => ({
  pb: {
    collection: vi.fn(),
    files: { getUrl: vi.fn() }
  },
}));

describe('MenuRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchItems() should map snake_case to camelCase properly', async () => {
    const mockRecords = [{
      id: 'item1',
      name: 'Salad',
      price: 20,
      stock: 5,
      is_active: false,
      is_poll: true,
      category_id: 'c1'
    }];
    
    const getFullList = vi.fn().mockResolvedValue(mockRecords);
    vi.mocked(pb.collection).mockReturnValue({ getFullList } as any);

    const result = await MenuRepository.fetchItems();
    
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 'item1',
      name: 'Salad',
      price: 20,
      cost: 0,
      description: '',
      stock: 5,
      isActive: false,
      image: '',
      isPoll: true,
      recipeId: undefined,
      assemblyId: undefined,
      categoryId: 'c1',
    });
  });
  
  it('toggleActive() should update is_active flag', async () => {
     const updateBlock = vi.fn();
     vi.mocked(pb.collection).mockReturnValue({ update: updateBlock } as any);
     
     await MenuRepository.toggleActive('item2', false);
     expect(updateBlock).toHaveBeenCalledWith('item2', { is_active: false });
  });

  it('updateStock() should call update with new stock', async () => {
    const updateBlock = vi.fn();
    vi.mocked(pb.collection).mockReturnValue({ update: updateBlock } as any);
    
    await MenuRepository.updateStock('item3', 10);
    expect(updateBlock).toHaveBeenCalledWith('item3', { stock: 10 });
  });

  it('fetchCategories() should return mapped categories', async () => {
    const mockRecords = [{ id: 'cat1', name: 'Soups', order_index: 2 }];
    const getFullList = vi.fn().mockResolvedValue(mockRecords);
    vi.mocked(pb.collection).mockReturnValue({ getFullList } as any);

    const result = await MenuRepository.fetchCategories();
    expect(result[0]).toEqual({
      id: 'cat1',
      name: 'Soups',
      orderIndex: 2
    });
  });

  it('delete() should call collection delete', async () => {
    const mockDelete = vi.fn().mockResolvedValue(true);
    vi.mocked(pb.collection).mockReturnValue({ delete: mockDelete } as any);

    await MenuRepository.delete('item4');
    expect(mockDelete).toHaveBeenCalledWith('item4');
  });

  it('saveItem() should create when no id, and update when has id', async () => {
    const mockCreate = vi.fn();
    const mockUpdate = vi.fn();
    vi.mocked(pb.collection).mockReturnValue({ create: mockCreate, update: mockUpdate } as any);

    await MenuRepository.saveItem({ name: 'Burger', price: 50, isActive: true });
    expect(mockCreate).toHaveBeenCalled();

    await MenuRepository.saveItem({ id: 'existing', name: 'Burger', price: 60 });
    expect(mockUpdate).toHaveBeenCalled();
  });
});
