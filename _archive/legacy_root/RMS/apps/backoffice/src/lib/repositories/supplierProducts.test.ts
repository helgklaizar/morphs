import { describe, it, expect, vi } from 'vitest';
import { SupplierProductsRepository } from './supplierProducts';
import { pb } from '../pocketbase';

vi.mock('../pocketbase', () => ({
  pb: { 
    collection: vi.fn(),
    filter: vi.fn((query) => query)
  },
}));

describe('SupplierProductsRepository', () => {
  it('fetchProducts()', async () => {
    const getList = vi.fn().mockResolvedValue([{ id: 'p1', supplier: 'sup1', name: 'N', price: 10, unit: 'шт' }]);
    vi.mocked(pb.collection).mockReturnValue({ getFullList: getList } as any);
    const res = await SupplierProductsRepository.fetchProducts('sup1');
    expect(res).toEqual([{ id: 'p1', supplier_id: 'sup1', name: 'N', image_url: '', notes: '', prices: { 'шт': 10 } }]);
  });

  it('fetchOrders()', async () => {
    const getList = vi.fn().mockResolvedValue([{ id: 'o1' }]);
    vi.mocked(pb.collection).mockReturnValue({ getFullList: getList } as any);
    const res = await SupplierProductsRepository.fetchOrders('sup1');
    expect(res).toEqual([{ id: 'o1' }]);
  });

  it('addProduct(), deleteProduct()', async () => {
    const create = vi.fn();
    const mockDel = vi.fn();
    vi.mocked(pb.collection).mockReturnValue({ create, delete: mockDel } as any);
    
    await SupplierProductsRepository.addProduct({ name: 'Milk' });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Milk' }));
    
    await SupplierProductsRepository.deleteProduct('p1');
    expect(mockDel).toHaveBeenCalledWith('p1');
  });

  it('createOrder() computes total amount correctly', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'ord_new' });
    vi.mocked(pb.collection).mockReturnValue({ create } as any);

    const items = [
      { price: 10, quantity: 2 }, // 20
      { price: 5, quantity: 4 }   // 20
    ] as any;

    const res = await SupplierProductsRepository.createOrder('sup1', items, 'email');
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      total_amount: 40,
      sent_via: 'email'
    }));
  });
});
