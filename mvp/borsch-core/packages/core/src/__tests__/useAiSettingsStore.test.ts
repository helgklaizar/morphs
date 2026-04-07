import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAiSettingsStore } from '../store/useAiSettingsStore';
import { AiSettingsRepository } from '@rms/db-local';

vi.mock('@rms/db-local', () => ({
  AiSettingsRepository: {
    fetch: vi.fn(),
    update: vi.fn()
  }
}));

describe('useAiSettingsStore', () => {
  beforeEach(() => {
    useAiSettingsStore.setState({ settings: null, isLoading: true, error: null });
    vi.clearAllMocks();
  });

  it('fetchSettings', async () => {
    vi.mocked(AiSettingsRepository.fetch).mockResolvedValue({ id: 's1', model_name: 'gpt-4' } as any);
    await useAiSettingsStore.getState().fetchSettings();

    expect(useAiSettingsStore.getState().settings?.model_name).toBe('gpt-4');
  });

  it('updateSettings', async () => {
    useAiSettingsStore.setState({ settings: { id: 's1', model_name: 'gpt-4' } as any });
    vi.mocked(AiSettingsRepository.update).mockResolvedValue({ id: 's1', model_name: 'gpt-4o' } as any);
    
    await useAiSettingsStore.getState().updateSettings({ model_name: 'gpt-4o' });
    expect(AiSettingsRepository.update).toHaveBeenCalledWith('s1', { model_name: 'gpt-4o' });
    expect(useAiSettingsStore.getState().settings?.model_name).toBe('gpt-4o');
  });
});
