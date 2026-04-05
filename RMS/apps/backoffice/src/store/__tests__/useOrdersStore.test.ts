import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useOrdersStore } from '../useOrdersStore';
import { OrdersRepository } from '@/lib/repositories/orders';
import { LocalOrdersRepository } from '@/lib/repositories/localOrders';

vi.mock('@/lib/repositories/orders', () => ({
  OrdersRepository: {
    fetchAll: vi.fn(),
    updateStatus: vi.fn(),
    updateFields: vi.fn(),
    delete: vi.fn(),
    archive: vi.fn()
  }
}));

vi.mock('@/lib/repositories/localOrders', () => ({
  LocalOrdersRepository: {
    updateFull: vi.fn()
  }
}));

describe('useOrdersStore', () => {
  beforeEach(() => {
    useOrdersStore.setState({ orders: [], isLoading: true, error: null });
    vi.clearAllMocks();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('fetchOrders populates orders', async () => {
    const mockOrders = [{ id: 'ord1', status: 'new' }];
    vi.mocked(OrdersRepository.fetchAll).mockResolvedValue(mockOrders as any);

    await useOrdersStore.getState().fetchOrders();
    expect(useOrdersStore.getState().orders).toEqual(mockOrders);
    expect(useOrdersStore.getState().isLoading).toBe(false);
  });

  it('updateOrderStatus optimistic update', async () => {
    useOrdersStore.setState({ orders: [{ id: 'ord2', status: 'new' } as any] });

    await useOrdersStore.getState().updateOrderStatus('ord2', 'ready');
    
    expect(useOrdersStore.getState().orders[0].status).toBe('ready');
    expect(OrdersRepository.updateStatus).toHaveBeenCalledWith('ord2', 'ready');
  });

  it('updateOrderStatus rollback on error', async () => {
    useOrdersStore.setState({ orders: [{ id: 'ord3', status: 'new' } as any] });
    vi.mocked(OrdersRepository.updateStatus).mockRejectedValue(new Error('fail'));

    await useOrdersStore.getState().updateOrderStatus('ord3', 'ready');
    
    expect(useOrdersStore.getState().orders[0].status).toBe('new'); 
  });

  it('updateOrderFull delegates to local tracking', async () => {
    const rfMock = vi.fn();
    useOrdersStore.setState({ fetchOrders: rfMock });

    await useOrdersStore.getState().updateOrderFull({ id: 'ordX' } as any);
    expect(LocalOrdersRepository.updateFull).toHaveBeenCalled();
    expect(rfMock).toHaveBeenCalled();
  });

  it('deleteOrder removes from state', async () => {
    useOrdersStore.setState({ orders: [{ id: 'ord4' } as any] });
    
    await useOrdersStore.getState().deleteOrder('ord4');
    expect(useOrdersStore.getState().orders.length).toBe(0);
    expect(OrdersRepository.delete).toHaveBeenCalledWith('ord4');
  });

  it('archiveOrder removes from active view', async () => {
    useOrdersStore.setState({ orders: [{ id: 'ord5' } as any] });
    
    await useOrdersStore.getState().archiveOrder('ord5');
    expect(useOrdersStore.getState().orders.length).toBe(0);
    expect(OrdersRepository.archive).toHaveBeenCalledWith('ord5');
  });
});
