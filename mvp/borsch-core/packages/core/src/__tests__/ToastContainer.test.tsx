import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { act } from 'react';
import { ToastContainer } from '../../components/ui/ToastContainer';
import { useToastStore } from '../system/useToastStore';

describe('ToastContainer', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
  });

  it('не рендерит ничего когда тостов нет', () => {
    const { container } = render(<ToastContainer />);
    // Контейнер пустой — нет toast элементов
    expect(container.querySelectorAll('[class*="rounded-xl"]')).toHaveLength(0);
  });

  it('рендерит toast с текстом сообщения', async () => {
    await act(async () => {
      useToastStore.getState().success('Успешно сохранено');
    });

    render(<ToastContainer />);

    expect(screen.getByText('Успешно сохранено')).toBeInTheDocument();
  });

  it('рендерит иконку ✅ для success toast', async () => {
    await act(async () => {
      useToastStore.getState().success('Готово');
    });

    render(<ToastContainer />);

    expect(screen.getByText('✅')).toBeInTheDocument();
  });

  it('рендерит иконку ❌ для error toast', async () => {
    await act(async () => {
      useToastStore.getState().error('Ошибка');
    });

    render(<ToastContainer />);

    expect(screen.getByText('❌')).toBeInTheDocument();
  });

  it('рендерит иконку ⚠️ для warning toast', async () => {
    await act(async () => {
      useToastStore.getState().warning('Внимание');
    });

    render(<ToastContainer />);

    expect(screen.getByText('⚠️')).toBeInTheDocument();
  });

  it('рендерит иконку ℹ️ для info toast', async () => {
    await act(async () => {
      useToastStore.getState().toast('Информация', 'info');
    });

    render(<ToastContainer />);

    expect(screen.getByText('ℹ️')).toBeInTheDocument();
  });

  it('кнопка ✕ вызывает dismiss и удаляет toast', async () => {
    await act(async () => {
      useToastStore.getState().success('Закрой меня');
    });

    render(<ToastContainer />);
    expect(screen.getByText('Закрой меня')).toBeInTheDocument();

    const dismissBtn = screen.getByText('✕');
    await act(async () => {
      fireEvent.click(dismissBtn);
    });

    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('рендерит несколько тостов одновременно', async () => {
    await act(async () => {
      useToastStore.getState().success('Первый');
      useToastStore.getState().error('Второй');
      useToastStore.getState().warning('Третий');
    });

    render(<ToastContainer />);

    expect(screen.getByText('Первый')).toBeInTheDocument();
    expect(screen.getByText('Второй')).toBeInTheDocument();
    expect(screen.getByText('Третий')).toBeInTheDocument();
  });
});
