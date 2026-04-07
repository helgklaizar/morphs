import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WorkersPage from '../app/(protected)/workers/page';
import { useWorkersStore } from '@rms/core';

// Mock the page since it uses many things
vi.mock('@rms/core', () => ({
  useWorkersStore: vi.fn(),
}));

describe('WorkersPage Integration', () => {
  it('renders workers and responds to Add button', () => {
    const mockWorkers = [
      { id: '1', name: 'Иван', role: 'Повар', hourly_rate: 50, status: 'active', created: '2026-01-01' },
    ];
    
    (useWorkersStore as any).mockReturnValue({
      workers: mockWorkers,
      isLoading: false,
      fetchWorkers: vi.fn(),
      addWorker: vi.fn(),
      updateWorker: vi.fn(),
      deleteWorker: vi.fn(),
      subscribeToWorkers: vi.fn(),
      unsubscribeFromWorkers: vi.fn(),
    });

    render(<WorkersPage />);
    
    expect(screen.getByText(/ИВАН/i)).toBeDefined();
    expect(screen.getByText(/Добавить сотрудника/i)).toBeDefined();
    
    // Click add button
    fireEvent.click(screen.getByText('Добавить сотрудника'));
    expect(screen.getByText('Новый сотрудник')).toBeDefined();
  });
});
