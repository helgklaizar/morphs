import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useInventoryStore } from '../store/useInventoryStore';
import { InventoryRepository } from '@rms/db-local';

vi.mock('@rms/db-local', () => ({
  InventoryRepository: {
    fetchAll: vi.fn(),
    addCategory: vi.fn(),
    deleteCategory: vi.fn(),
    saveItem: vi.fn(),
    deleteItem: vi.fn(),
    updateQuantity: vi.fn(),
    updateCategoryVisibility: vi.fn(),
    updateCategoryOrder: vi.fn()
  }
}));

describe('useInventoryStore', () => {
  beforeEach(() => {
    useInventoryStore.setState({ categories: [], isLoading: true, error: null });
    vi.clearAllMocks();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('fetchInventory sets data', async () => {
    const cats = [{ id: 'c1', name: 'Drinks', items: [] }];
    vi.mocked(InventoryRepository.fetchAll).mockResolvedValue(cats as any);

    await useInventoryStore.getState().fetchInventory();
    expect(useInventoryStore.getState().categories).toEqual(cats);
    expect(useInventoryStore.getState().isLoading).toBe(false);
  });

  it('addCategory checks max order index and triggers refetch', async () => {
    useInventoryStore.setState({ categories: [{ orderIndex: 5 } as any] });
    const rfMock = vi.fn();
    useInventoryStore.setState({ fetchInventory: rfMock });

    await useInventoryStore.getState().addCategory('NewCat');
    expect(InventoryRepository.addCategory).toHaveBeenCalledWith('NewCat', 5);
    expect(rfMock).toHaveBeenCalled();
  });

  it('updateItemQuantity updates deep inside tree', async () => {
    useInventoryStore.setState({
      categories: [{
        id: 'c2',
        items: [{ id: 'itm1', quantity: 10 }]
      } as any]
    });

    await useInventoryStore.getState().updateItemQuantity('itm1', 20);
    
    // Check local optimistic update
    expect(useInventoryStore.getState().categories[0].items[0].quantity).toBe(20);
    // Check repository call
    expect(InventoryRepository.updateQuantity).toHaveBeenCalledWith('itm1', 20);
  });

  it('toggleCategoryVisibility updates local state properly', async () => {
    useInventoryStore.setState({
      categories: [{ id: 'c3', isVisibleInAssemblies: false, isVisibleInRecipe: false } as any]
    });

    await useInventoryStore.getState().toggleCategoryVisibility('c3', 'is_visible_in_assemblies', true);
    
    expect(useInventoryStore.getState().categories[0].isVisibleInAssemblies).toBe(true);
    expect(useInventoryStore.getState().categories[0].isVisibleInRecipe).toBe(false);
    expect(InventoryRepository.updateCategoryVisibility).toHaveBeenCalledWith('c3', 'is_visible_in_assemblies', true);
  });

  it('reorderCategories splices array and triggers updates', async () => {
    useInventoryStore.setState({
      categories: [
        { id: 'c1', name: 'Zero' },
        { id: 'c2', name: 'One' },
        { id: 'c3', name: 'Two' }
      ] as any
    });

    // Move 'c3' from index 2 to index 0
    await useInventoryStore.getState().reorderCategories(2, 0);

    const cats = useInventoryStore.getState().categories;
    expect(cats[0].id).toBe('c3');
    expect(cats[0].orderIndex).toBe(0);
    expect(cats[1].id).toBe('c1');
    expect(cats[1].orderIndex).toBe(1);
    
    expect(InventoryRepository.updateCategoryOrder).toHaveBeenCalledWith('c3', 0);
  });
});
