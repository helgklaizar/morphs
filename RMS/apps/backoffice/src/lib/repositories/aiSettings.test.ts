import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AiSettingsRepository } from './aiSettings';
import { pb } from '../pocketbase';

vi.mock('../pocketbase', () => ({
  pb: {
    collection: vi.fn(),
  },
}));

describe('AiSettingsRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetch() should return settings object', async () => {
    const getFirstListItem = vi.fn().mockResolvedValue({ id: 'set1', openai_key: 'test' });
    vi.mocked(pb.collection).mockReturnValue({ getFirstListItem } as any);

    const result = await AiSettingsRepository.fetch();
    expect(result?.id).toBe('set1');
  });

  it('fetch() should return null on 404', async () => {
    const err = new Error('not found');
    (err as any).status = 404;
    const getFirstListItem = vi.fn().mockRejectedValue(err);
    vi.mocked(pb.collection).mockReturnValue({ getFirstListItem } as any);

    const result = await AiSettingsRepository.fetch();
    expect(result).toBeNull();
  });

  it('update() should send payload', async () => {
    const update = vi.fn().mockResolvedValue({ id: 'set1', openai_key: 'new' });
    vi.mocked(pb.collection).mockReturnValue({ update } as any);

    const result = await AiSettingsRepository.update('set1', { openai_key: 'new' });
    expect(update).toHaveBeenCalledWith('set1', { openai_key: 'new' });
    expect(result.openai_key).toBe('new');
  });
});
