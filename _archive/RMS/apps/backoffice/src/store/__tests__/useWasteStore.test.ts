import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useWasteStore } from '../useWasteStore';
import { WasteRepository } from '@/lib/repositories/waste';

vi.mock('@/lib/repositories/waste', () => ({
  WasteRepository: {
    fetchAll: vi.fn(),
    addWaste: vi.fn()
  }
}));

describe('useWasteStore', () => {
  beforeEach(() => {
    useWasteStore.setState({ records: [], isLoading: true, error: null });
    vi.clearAllMocks();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('fetchWaste', async () => {
    vi.mocked(WasteRepository.fetchAll).mockResolvedValue([{ id: 'w1' }] as any);
    await useWasteStore.getState().fetchWaste();
    expect(useWasteStore.getState().records[0].id).toBe('w1');
  });

  it('addWaste triggers refetch', async () => {
    const rfMock = vi.fn();
    useWasteStore.setState({ fetchWaste: rfMock });

    await useWasteStore.getState().addWaste({ reason: 'lost' });
    expect(WasteRepository.addWaste).toHaveBeenCalledWith(expect.objectContaining({ reason: 'lost' }));
    expect(rfMock).toHaveBeenCalled();
  });
});
