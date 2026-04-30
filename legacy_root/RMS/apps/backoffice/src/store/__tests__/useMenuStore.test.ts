import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useMenuStore } from '../useMenuStore';
import { MenuRepository } from '@/lib/repositories/menu';
import { pb } from '@/lib/pocketbase';

vi.mock('@/lib/repositories/menu', () => ({
  MenuRepository: {
    fetchCategories: vi.fn(),
    updateStock: vi.fn(),
    toggleActive: vi.fn(),
    saveItem: vi.fn(),
    delete: vi.fn()
  }
}));

vi.mock('@/lib/pocketbase', () => ({
  pb: {
    collection: vi.fn(() => ({
      getFullList: vi.fn(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn()
    })),
    files: {
      getUrl: vi.fn().mockReturnValue('mock-url')
    }
  }
}));

describe('useMenuStore', () => {
  beforeEach(() => {
    useMenuStore.setState({ items: [], categories: [], isLoading: true, error: null });
    vi.clearAllMocks();
  });

  it('fetchCategories resolves and sets state', async () => {
    const cats = [{ id: 'cat1', name: 'Drinks', orderIndex: 1 }];
    vi.mocked(MenuRepository.fetchCategories).mockResolvedValue(cats);
    
    await useMenuStore.getState().fetchCategories();
    expect(useMenuStore.getState().categories).toEqual(cats);
  });

  it('fetchMenuItems loads from pb directly', async () => {
    const getFullList = vi.fn().mockResolvedValue([{
      id: 'i1', name: 'Coffee', is_active: true, expand: { category_id: { name: 'Drinks' } }
    }]);
    vi.mocked(pb.collection).mockReturnValue({ getFullList } as any);

    await useMenuStore.getState().fetchMenuItems();
    
    expect(useMenuStore.getState().isLoading).toBe(false);
    expect(useMenuStore.getState().items[0].name).toBe('Coffee');
    expect(useMenuStore.getState().items[0].isActive).toBe(true);
    expect(useMenuStore.getState().items[0].categoryName).toBe('Drinks');
  });

  it('updateStock updates local state instantly and calls repo', async () => {
    useMenuStore.setState({ items: [{ id: 'i1', stock: 10 } as any] });
    
    await useMenuStore.getState().updateStock('i1', 5);
    
    expect(useMenuStore.getState().items[0].stock).toBe(5);
    expect(MenuRepository.updateStock).toHaveBeenCalledWith('i1', 5);
  });

  it('toggleActive instantly toggles state', async () => {
    useMenuStore.setState({ items: [{ id: 'i1', isActive: true } as any] });
    
    await useMenuStore.getState().toggleActive('i1', true);
    
    expect(useMenuStore.getState().items[0].isActive).toBe(false);
    expect(MenuRepository.toggleActive).toHaveBeenCalledWith('i1', false);
  });

  it('saveMenuItem and deleteMenuItem call refetch', async () => {
    const fetchMenuItemsMock = vi.fn();
    useMenuStore.setState({ fetchMenuItems: fetchMenuItemsMock });

    await useMenuStore.getState().saveMenuItem({ name: 'Tea' });
    expect(MenuRepository.saveItem).toHaveBeenCalled();
    expect(fetchMenuItemsMock).toHaveBeenCalled();

    await useMenuStore.getState().deleteMenuItem('i2');
    expect(MenuRepository.delete).toHaveBeenCalledWith('i2');
    expect(fetchMenuItemsMock).toHaveBeenCalledTimes(2);
  });
});
