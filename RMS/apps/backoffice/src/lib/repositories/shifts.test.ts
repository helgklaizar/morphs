import { describe, it, expect, vi } from 'vitest';
import { ShiftsRepository } from './shifts';
import { pb } from '../pocketbase';

vi.mock('../pocketbase', () => ({
  pb: { collection: vi.fn() },
}));

describe('ShiftsRepository', () => {
  it('fetchAll() returns populated list', async () => {
    const list = [{ id: 's1' }];
    vi.mocked(pb.collection).mockReturnValue({ getFullList: vi.fn().mockResolvedValue(list) } as any);
    const res = await ShiftsRepository.fetchAll();
    expect(res).toEqual(list);
  });

  it('startShift() creates a shift', async () => {
    const create = vi.fn();
    vi.mocked(pb.collection).mockReturnValue({ create } as any);

    await ShiftsRepository.startShift('wrk1');
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ worker_id: 'wrk1' }));
  });

  it('endShift() calculates hours and pay', async () => {
    const update = vi.fn();
    vi.mocked(pb.collection).mockReturnValue({ update } as any);

    // 2 hours ago
    const startTime = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    
    await ShiftsRepository.endShift('s2', startTime, 15);
    
    // Check that update is called and the hours/pay is approximately correct
    expect(update).toHaveBeenCalled();
    const args = update.mock.calls[0][1];
    expect(args.total_hours).toBeGreaterThanOrEqual(1.99);
    expect(args.total_pay).toBeGreaterThanOrEqual(15 * 1.99);
  });
});
