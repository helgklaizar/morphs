import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSupplierProductsStore } from '../store/useSupplierProductsStore';
import { SupplierProductsRepository } from '@rms/db-local';

vi.mock('@rms/db-local', () => ({
  SupplierProductsRepository: {
    fetchProducts: vi.fn(),
    fetchOrders: vi.fn(),
    addProduct: vi.fn(),
    deleteProduct: vi.fn(),
    createOrder: vi.fn()
  }
}));

describe('useSupplierProductsStore', () => {
  beforeEach(() => {
    useSupplierProductsStore.setState({ products: [], orders: [], isLoading: false, error: null });
    vi.clearAllMocks();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('fetchProducts skips if no cur supplierId', async () => {
    await useSupplierProductsStore.getState().fetchProducts('');
    expect(SupplierProductsRepository.fetchProducts).not.toHaveBeenCalled();
  });

  it('fetchProducts loads data', async () => {
    vi.mocked(SupplierProductsRepository.fetchProducts).mockResolvedValue([{ id: 'p1' }] as any);
    await useSupplierProductsStore.getState().fetchProducts('sup1');
    expect(useSupplierProductsStore.getState().products[0].id).toBe('p1');
  });

  it('fetchOrders loads data', async () => {
    vi.mocked(SupplierProductsRepository.fetchOrders).mockResolvedValue([{ id: 'o1' }] as any);
    await useSupplierProductsStore.getState().fetchOrders('sup1');
    expect(useSupplierProductsStore.getState().orders[0].id).toBe('o1');
  });

  it('addProduct triggers refetch if supplierId present', async () => {
    const rfMock = vi.fn();
    useSupplierProductsStore.setState({ fetchProducts: rfMock });

    await useSupplierProductsStore.getState().addProduct({ name: 'Milk', supplierId: 'sup1' });
    expect(SupplierProductsRepository.addProduct).toHaveBeenCalled();
    expect(rfMock).toHaveBeenCalledWith('sup1');
  });

  it('deleteProduct triggers refetch', async () => {
    const rfMock = vi.fn();
    useSupplierProductsStore.setState({ fetchProducts: rfMock });

    await useSupplierProductsStore.getState().deleteProduct('p1', 'sup1');
    expect(SupplierProductsRepository.deleteProduct).toHaveBeenCalledWith('p1');
    expect(rfMock).toHaveBeenCalledWith('sup1');
  });

  it('createOrder triggers refetch', async () => {
    const rfMock = vi.fn();
    useSupplierProductsStore.setState({ fetchOrders: rfMock });

    await useSupplierProductsStore.getState().createOrder('sup1', [], 'telegram');
    expect(SupplierProductsRepository.createOrder).toHaveBeenCalled();
    expect(rfMock).toHaveBeenCalledWith('sup1');
  });
});
