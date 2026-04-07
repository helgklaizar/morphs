import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useHistoryStore } from '../store/useHistoryStore';
import { HistoryRepository } from '@rms/db-local';

vi.mock('@rms/db-local', () => ({
  HistoryRepository: {
    fetchHistory: vi.fn()
  }
}));

describe('useHistoryStore', () => {
  beforeEach(() => {
    useHistoryStore.setState({ history: [], isLoading: true, error: null });
    vi.clearAllMocks();
  });

  it('fetchHistory', async () => {
    vi.mocked(HistoryRepository.fetchHistory).mockResolvedValue([{ id: 'h1' }] as any);
    await useHistoryStore.getState().fetchHistory();
    expect(useHistoryStore.getState().history[0].id).toBe('h1');
  });

  it('fetchHistory handles error', async () => {
    vi.mocked(HistoryRepository.fetchHistory).mockRejectedValue(new Error('error msg'));
    await useHistoryStore.getState().fetchHistory();
    expect(useHistoryStore.getState().error).toBe('error msg');
  });
});
