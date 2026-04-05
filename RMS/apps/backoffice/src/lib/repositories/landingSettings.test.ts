import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LandingSettingsRepository } from './landingSettings';
import { pb } from '../pocketbase';

vi.mock('../pocketbase', () => ({
  pb: {
    collection: vi.fn(),
  },
}));

describe('LandingSettingsRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetch() should return landing settings object', async () => {
    const getFirstListItem = vi.fn().mockResolvedValue({ id: 'ls1', store_name: 'RMS' });
    vi.mocked(pb.collection).mockReturnValue({ getFirstListItem } as any);

    const result = await LandingSettingsRepository.fetch();
    expect(result?.id).toBe('ls1');
  });

  it('fetch() should return null on 404', async () => {
    const err = new Error('not found');
    (err as any).status = 404;
    const getFirstListItem = vi.fn().mockRejectedValue(err);
    vi.mocked(pb.collection).mockReturnValue({ getFirstListItem } as any);

    const result = await LandingSettingsRepository.fetch();
    expect(result).toBeNull();
  });

  it('update() should send payload', async () => {
    const update = vi.fn().mockResolvedValue({ id: 'ls1', store_name: 'Shop' });
    vi.mocked(pb.collection).mockReturnValue({ update } as any);

    const result = await LandingSettingsRepository.update('ls1', { store_name: 'Shop' });
    expect(update).toHaveBeenCalledWith('ls1', { store_name: 'Shop' });
    expect(result.store_name).toBe('Shop');
  });
});
