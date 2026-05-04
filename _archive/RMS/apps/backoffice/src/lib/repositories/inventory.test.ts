import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InventoryRepository } from './inventory';
import { pb } from '../pocketbase';

vi.mock('../pocketbase', () => ({
  pb: {
    collection: vi.fn(),
  },
}));

// Mock Notifications implicitly since the code dynamically imports it
vi.mock('./notifications', () => ({
  NotificationsRepository: {
    notify: vi.fn()
  }
}));

describe('InventoryRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchAll() maps categories and items properly', async () => {
    const catData = [{ id: 'cat1', name: 'Dairy', order_index: 1 }];
    const itemData = [{ id: 'itm1', name: 'Milk', category_id: 'cat1', price: 5 }];

    // We do sequential mocks for categories and items
    const getFullList = vi.fn()
      .mockResolvedValueOnce(catData)
      .mockResolvedValueOnce(itemData);

    vi.mocked(pb.collection).mockReturnValue({ getFullList } as any);

    const result = await InventoryRepository.fetchAll();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Dairy');
    expect(result[0].items[0].name).toBe('Milk');
  });

  it('addCategory() and deleteCategory() call DB with correct params', async () => {
    const create = vi.fn();
    const mockDelete = vi.fn();
    vi.mocked(pb.collection).mockReturnValue({ create, delete: mockDelete } as any);

    await InventoryRepository.addCategory('Meat', 5);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Meat', order_index: 6 }));

    await InventoryRepository.deleteCategory('cat_del');
    expect(mockDelete).toHaveBeenCalledWith('cat_del');
  });

  it('saveItem() creates a new item if no ID', async () => {
    const create = vi.fn();
    vi.mocked(pb.collection).mockReturnValue({ create } as any);

    await InventoryRepository.saveItem({ name: 'Beef', categoryId: 'cat2' });
    expect(create).toHaveBeenCalled();
  });

  it('saveItem() updates an existing item and triggers price jump notification', async () => {
    const update = vi.fn();
    const getOne = vi.fn().mockResolvedValue({ price: 10 }); // Old price is 10
    vi.mocked(pb.collection).mockReturnValue({ update, getOne } as any);

    const { NotificationsRepository } = await import('./notifications');

    // New price is 20 (100% jump)
    await InventoryRepository.saveItem({ id: 'itm2', name: 'Beef', categoryId: 'cat2', price: 20 });
    
    expect(update).toHaveBeenCalledWith('itm2', expect.objectContaining({ price: 20 }));
    expect(NotificationsRepository.notify).toHaveBeenCalledWith(
      expect.stringContaining('Скачок цены'),
      expect.stringContaining('подорожал на 100%'),
      'price_warning'
    );
  });

  it('updateQuantity(), deleteItem(), updateCategoryVisibility(), updateCategoryOrder() do mapping correctly', async () => {
    const update = vi.fn();
    const mockDelete = vi.fn();
    vi.mocked(pb.collection).mockReturnValue({ update, delete: mockDelete } as any);

    await InventoryRepository.updateQuantity('itm3', 50);
    expect(update).toHaveBeenCalledWith('itm3', { quantity: 50 });

    await InventoryRepository.deleteItem('itm4');
    expect(mockDelete).toHaveBeenCalledWith('itm4');

    await InventoryRepository.updateCategoryVisibility('cat4', 'is_visible_in_recipe', false);
    expect(update).toHaveBeenCalledWith('cat4', { is_visible_in_recipe: false });

    await InventoryRepository.updateCategoryOrder('cat5', 10);
    expect(update).toHaveBeenCalledWith('cat5', { order_index: 10 });
  });
});
