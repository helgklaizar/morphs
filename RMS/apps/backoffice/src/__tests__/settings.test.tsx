import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SettingsPage from '../app/(protected)/settings/page';
import { useAiSettingsStore } from '../store/useAiSettingsStore';
import { useLandingSettingsStore } from '../store/useLandingSettingsStore';
import { useTranslationsStore } from '../store/useTranslationsStore';
import { useRouter, useSearchParams } from 'next/navigation';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}));

vi.mock('../store/useAiSettingsStore', () => ({
  useAiSettingsStore: vi.fn(),
}));

vi.mock('../store/useLandingSettingsStore', () => ({
  useLandingSettingsStore: vi.fn(),
}));

vi.mock('../store/useTranslationsStore', () => ({
  useTranslationsStore: vi.fn(),
}));

describe('SettingsPage Integration', () => {
  it('renders settings and handles tabs', () => {
    (useRouter as any).mockReturnValue({ push: vi.fn() });
    (useSearchParams as any).mockReturnValue({ get: vi.fn().mockReturnValue(null) });

    (useAiSettingsStore as any).mockReturnValue({
      settings: null,
      fetchSettings: vi.fn(),
      updateSettings: vi.fn(),
    });

    (useLandingSettingsStore as any).mockReturnValue({
      settings: { store_name: 'RMS AI OS', is_delivery_enabled: true },
      fetchSettings: vi.fn(),
      updateSettings: vi.fn(),
    });

    (useTranslationsStore as any).mockReturnValue({
      translations: [{ id: '1', key: 'welcome', en: 'Welcome', he: '', uk: '' }],
      fetchTranslations: vi.fn(),
      addTranslation: vi.fn(),
      updateTranslation: vi.fn(),
      deleteTranslation: vi.fn(),
    });

    render(<SettingsPage />);

    // Check title
    expect(screen.getByText('Настройки')).toBeDefined();

    // The first tab (General) inputs
    expect(screen.getByText('Название магазина')).toBeDefined();
    expect(screen.getByDisplayValue('RMS AI OS')).toBeDefined();

    // Click Translations tab
    const transTab = screen.getByText('Локализация');
    fireEvent.click(transTab);

    // Verify it changed
    expect(screen.getByText('Добавить ключ')).toBeDefined();
    expect(screen.getByText('welcome')).toBeDefined();
    expect(screen.getByDisplayValue('Welcome')).toBeDefined();
  });
});
