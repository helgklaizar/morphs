import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrdersRepository } from './orders';
import { pb } from '../pocketbase';

vi.mock('../pocketbase', () => ({
  pb: {
    collection: vi.fn(),
  },
}));

describe('OrdersRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updateStatus() should call pocketbase with correct args', async () => {
    const updateBlock = vi.fn();
    vi.mocked(pb.collection).mockReturnValue({ update: updateBlock } as any);
    
    await OrdersRepository.updateStatus('ord1', 'completed');
    expect(updateBlock).toHaveBeenCalledWith('ord1', { status: 'completed' });
  });
  
  it('create() should map fields to snake_case payload', async () => {
    const mockCreate = vi.fn().mockResolvedValue({ id: 'ord123', created: '2026-01-01', status: 'new' });
    vi.mocked(pb.collection).mockReturnValue({ create: mockCreate } as any);
    
    const payload = { customerName: 'Ivan', totalAmount: 150 };
    const result = await OrdersRepository.create(payload);
    
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
       customer_name: 'Ivan',
       total_amount: 150,
       is_archived: false,
       payment_method: 'cash'
    }));
    
    expect(result.id).toBe('ord123');
    expect(result.customerName).toBe('Ivan');
  });

  it('archive() should set is_archived to true', async () => {
    const updateBlock = vi.fn();
    vi.mocked(pb.collection).mockReturnValue({ update: updateBlock } as any);

    await OrdersRepository.archive('ord999');
    expect(updateBlock).toHaveBeenCalledWith('ord999', { is_archived: true });
  });

  it('updateFields() should update dynamically', async () => {
    const updateBlock = vi.fn();
    vi.mocked(pb.collection).mockReturnValue({ update: updateBlock } as any);

    await OrdersRepository.updateFields('ord5', { customerName: 'Alex', totalAmount: 200 });
    expect(updateBlock).toHaveBeenCalledWith('ord5', { customer_name: 'Alex', total_amount: 200 });
  });

  it('delete() should drop order', async () => {
    const mockDelete = vi.fn();
    vi.mocked(pb.collection).mockReturnValue({ delete: mockDelete } as any);

    await OrdersRepository.delete('ord_del');
    expect(mockDelete).toHaveBeenCalledWith('ord_del');
  });

  it('createItem() should map correctly', async () => {
    const mockCreate = vi.fn();
    vi.mocked(pb.collection).mockReturnValue({ create: mockCreate } as any);
    
    await OrdersRepository.createItem('ord1', {
      id: 'itm_1',
      menuItemId: 'm1',
      menuItemName: 'Борщ',
      quantity: 2,
      priceAtTime: 30
    });
    
    expect(mockCreate).toHaveBeenCalledWith({
      order_id: 'ord1',
      menu_item_id: 'm1',
      menu_item_name: 'Борщ',
      quantity: 2,
      price_at_time: 30
    });
  });

  it('fetchAll() should return joined order records', async () => {
    const getFullList = vi.fn()
      .mockResolvedValueOnce([{ id: 'ord1', customer_name: 'Alex' }]) // Orders list
      .mockResolvedValueOnce([{ id: 'item1', order_id: 'ord1', menu_item_name: 'RMS' }]); // Items list

    vi.mocked(pb.collection).mockReturnValue({ getFullList } as any);

    const result = await OrdersRepository.fetchAll();
    
    // Check if relationships worked
    expect(result[0].customerName).toBe('Alex');
    expect(result[0].items[0].menuItemName).toBe('RMS');
  });
});

