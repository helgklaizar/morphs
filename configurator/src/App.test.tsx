import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import App from './App';

// Мокаем глобальный fetch
(globalThis as any).fetch = vi.fn((url: RequestInfo | URL) => {
  const urlStr = url.toString();
  if (urlStr.includes('/profile')) {
    return Promise.resolve({ json: () => Promise.resolve({ name: 'Test Business', tier: 'pro' }) });
  }
  if (urlStr.includes('/blueprints')) {
    return Promise.resolve({ json: () => Promise.resolve([
      { id: 'restaurant', icon: '🍽️', title: 'Restaurant', desc: 'Для кафе' },
      { id: 'retail', icon: '🛍️', title: 'Retail', desc: 'Магазины' }
    ]) });
  }
  return Promise.resolve({ json: () => Promise.resolve({ status: "accepted" }) });
}) as unknown as ReturnType<typeof vi.fn>;

describe('Конфигуратор (Tauri UI Installer)', () => {
  it('рендерит заголовки и бизнес-профили', async () => {
    render(<App />);
    expect(screen.getByText(/Настрой своё/i)).toBeInTheDocument();
    expect(screen.getByText(/ИИ-Ядро/i)).toBeInTheDocument();
    expect(await screen.findByText(/Restaurant/i)).toBeInTheDocument();
  });

  it('при клике на Генерировать окно переходит в состояние загрузки Архитектора', async () => {
    render(<App />);
    
    // Ждем загрузки
    const retailBtn = await screen.findByText('Retail');
    fireEvent.click(retailBtn);
    
    // Клик по кнопке генерации
    const generateBtn = screen.getByText('Генерировать (Llama-3) →');
    fireEvent.click(generateBtn);
    
    // Проверяем, что появился спиннер загрузки
    expect(await screen.findByText('ИИ-Архитектор Моделирует Ядро...')).toBeInTheDocument();
  });
});
