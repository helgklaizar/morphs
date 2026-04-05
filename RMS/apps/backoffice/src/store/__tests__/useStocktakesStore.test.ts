import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useStocktakesStore } from '../useStocktakesStore';
import { StocktakesRepository } from '@/lib/repositories/stocktakes';

vi.mock('@/lib/repositories/stocktakes', () => ({
  StocktakesRepository: {
    fetchAll: vi.fn(),
    create: vi.fn()
  }
}));

describe('useStocktakesStore', () => {
  beforeEach(() => {
    useStocktakesStore.setState({ records: [], isLoading: true, error: null });
    vi.clearAllMocks();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('fetchStocktakes', async () => {
    vi.mocked(StocktakesRepository.fetchAll).mockResolvedValue([{ id: 'st1' }] as any);
    await useStocktakesStore.getState().fetchStocktakes();
    expect(useStocktakesStore.getState().records[0].id).toBe('st1');
  });

  it('createStocktake triggers refetch', async () => {
    const rfMock = vi.fn();
    useStocktakesStore.setState({ fetchStocktakes: rfMock });

    await useStocktakesStore.getState().createStocktake([]);
    expect(StocktakesRepository.create).toHaveBeenCalledWith([]);
    expect(rfMock).toHaveBeenCalled();
  });
});
