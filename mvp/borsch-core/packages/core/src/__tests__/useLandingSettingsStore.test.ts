import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useLandingSettingsStore } from '../store/useLandingSettingsStore';
import { LandingSettingsRepository } from '@rms/db-local';

vi.mock('@rms/db-local', () => ({
  LandingSettingsRepository: {
    fetch: vi.fn(),
    update: vi.fn()
  }
}));

describe('useLandingSettingsStore', () => {
  beforeEach(() => {
    useLandingSettingsStore.setState({ settings: null, isLoading: true, error: null });
    vi.clearAllMocks();
  });

  it('fetchSettings', async () => {
    vi.mocked(LandingSettingsRepository.fetch).mockResolvedValue({ id: 's1', isDeliveryEnabled: true } as any);
    await useLandingSettingsStore.getState().fetchSettings();
    expect(useLandingSettingsStore.getState().settings?.id).toBe('s1');
  });

  it('updateSettings', async () => {
    useLandingSettingsStore.setState({ settings: { id: 's1' } as any });
    vi.mocked(LandingSettingsRepository.update).mockResolvedValue({ id: 's1', is_delivery_enabled: false } as any);

    await useLandingSettingsStore.getState().updateSettings({ is_delivery_enabled: false });
    expect(LandingSettingsRepository.update).toHaveBeenCalledWith('s1', { is_delivery_enabled: false });
    expect(useLandingSettingsStore.getState().settings?.is_delivery_enabled).toBe(false);
  });
});
