import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useShiftsStore } from '../useShiftsStore';
import { ShiftsRepository } from '@/lib/repositories/shifts';

vi.mock('@/lib/repositories/shifts', () => ({
  ShiftsRepository: {
    fetchAll: vi.fn(),
    startShift: vi.fn(),
    endShift: vi.fn()
  }
}));

describe('useShiftsStore', () => {
  beforeEach(() => {
    useShiftsStore.setState({ shifts: [], isLoading: true, error: null });
    vi.clearAllMocks();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('fetchShifts loads data', async () => {
    vi.mocked(ShiftsRepository.fetchAll).mockResolvedValue([{ id: 's1' }] as any);
    await useShiftsStore.getState().fetchShifts();
    expect(useShiftsStore.getState().shifts[0].id).toBe('s1');
  });

  it('startShift triggers refetch', async () => {
    const rfMock = vi.fn();
    useShiftsStore.setState({ fetchShifts: rfMock });

    await useShiftsStore.getState().startShift('w1');
    expect(ShiftsRepository.startShift).toHaveBeenCalledWith('w1');
    expect(rfMock).toHaveBeenCalled();
  });

  it('endShift triggers refetch', async () => {
    const rfMock = vi.fn();
    useShiftsStore.setState({ fetchShifts: rfMock });

    await useShiftsStore.getState().endShift('s1', 'time', 15);
    expect(ShiftsRepository.endShift).toHaveBeenCalledWith('s1', 'time', 15);
    expect(rfMock).toHaveBeenCalled();
  });
});
