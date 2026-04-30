import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSuppliersStore } from '../useSuppliersStore';
import { SuppliersRepository } from '@/lib/repositories/suppliers';

vi.mock('@/lib/repositories/suppliers', () => ({
  SuppliersRepository: {
    fetchAll: vi.fn(),
    add: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
}));

describe('useSuppliersStore', () => {
  beforeEach(() => {
    useSuppliersStore.setState({ suppliers: [], isLoading: true, error: null });
    vi.clearAllMocks();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('fetchSuppliers', async () => {
    vi.mocked(SuppliersRepository.fetchAll).mockResolvedValue([{ id: 'sup1' }] as any);
    await useSuppliersStore.getState().fetchSuppliers();
    expect(useSuppliersStore.getState().suppliers[0].id).toBe('sup1');
  });

  it('addSupplier triggers refetch', async () => {
    const rfMock = vi.fn();
    useSuppliersStore.setState({ fetchSuppliers: rfMock });

    await useSuppliersStore.getState().addSupplier({ name: 'S1' });
    expect(SuppliersRepository.add).toHaveBeenCalled();
    expect(rfMock).toHaveBeenCalled();
  });

  it('updateSupplier triggers refetch', async () => {
    const rfMock = vi.fn();
    useSuppliersStore.setState({ fetchSuppliers: rfMock });

    await useSuppliersStore.getState().updateSupplier('sup1', { name: 'S2' });
    expect(SuppliersRepository.update).toHaveBeenCalledWith('sup1', { name: 'S2' });
    expect(rfMock).toHaveBeenCalled();
  });

  it('deleteSupplier triggers refetch', async () => {
    const rfMock = vi.fn();
    useSuppliersStore.setState({ fetchSuppliers: rfMock });

    await useSuppliersStore.getState().deleteSupplier('sup1');
    expect(SuppliersRepository.delete).toHaveBeenCalledWith('sup1');
    expect(rfMock).toHaveBeenCalled();
  });
});
