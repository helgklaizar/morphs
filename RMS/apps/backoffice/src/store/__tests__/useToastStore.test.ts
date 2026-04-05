import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { useToastStore } from '../useToastStore';

describe('useToastStore', () => {
  beforeEach(() => {
    // Сбрасываем стор перед каждым тестом
    useToastStore.setState({ toasts: [] });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('добавляет toast с типом info по умолчанию', () => {
    act(() => {
      useToastStore.getState().toast('Привет мир');
    });

    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toBe('Привет мир');
    expect(toasts[0].type).toBe('info');
    expect(toasts[0].id).toBeDefined();
  });

  it('добавляет toast типа success', () => {
    act(() => {
      useToastStore.getState().success('Сохранено!');
    });

    const toasts = useToastStore.getState().toasts;
    expect(toasts[0].type).toBe('success');
    expect(toasts[0].message).toBe('Сохранено!');
  });

  it('добавляет toast типа error', () => {
    act(() => {
      useToastStore.getState().error('Что-то пошло не так');
    });

    const toasts = useToastStore.getState().toasts;
    expect(toasts[0].type).toBe('error');
  });

  it('добавляет toast типа warning', () => {
    act(() => {
      useToastStore.getState().warning('Осторожно!');
    });

    const toasts = useToastStore.getState().toasts;
    expect(toasts[0].type).toBe('warning');
  });

  it('добавляет несколько тостов с уникальными id', () => {
    act(() => {
      useToastStore.getState().success('Первый');
      useToastStore.getState().error('Второй');
      useToastStore.getState().info('Третий');
    });

    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(3);

    const ids = toasts.map((t) => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(3);
  });

  it('удаляет toast через dismiss', () => {
    act(() => {
      useToastStore.getState().success('Я исчезну');
    });

    const id = useToastStore.getState().toasts[0].id;

    act(() => {
      useToastStore.getState().dismiss(id);
    });

    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('dismiss не удаляет другие тосты', () => {
    act(() => {
      useToastStore.getState().success('Остаюсь');
      useToastStore.getState().error('Удалюсь');
    });

    const toasts = useToastStore.getState().toasts;
    const idToRemove = toasts[1].id;

    act(() => {
      useToastStore.getState().dismiss(idToRemove);
    });

    const remaining = useToastStore.getState().toasts;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].message).toBe('Остаюсь');
  });

  it('автоматически удаляет toast через 4 секунды', () => {
    act(() => {
      useToastStore.getState().toast('Автоудаление');
    });

    expect(useToastStore.getState().toasts).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('toast НЕ удаляется до 4 секунд', () => {
    act(() => {
      useToastStore.getState().toast('Ещё живой');
    });

    act(() => {
      vi.advanceTimersByTime(3999);
    });

    expect(useToastStore.getState().toasts).toHaveLength(1);
  });
});
