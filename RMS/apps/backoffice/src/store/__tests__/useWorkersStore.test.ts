import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useWorkersStore } from '../useWorkersStore';
import { WorkersRepository } from '@/lib/repositories/workers';

vi.mock('@/lib/repositories/workers', () => ({
  WorkersRepository: {
    fetchAll: vi.fn(),
    add: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
}));

describe('useWorkersStore', () => {
  beforeEach(() => {
    useWorkersStore.setState({ workers: [], isLoading: true, error: null });
    vi.clearAllMocks();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('fetchWorkers loads data', async () => {
    vi.mocked(WorkersRepository.fetchAll).mockResolvedValue([{ id: 'w1' }] as any);
    await useWorkersStore.getState().fetchWorkers();
    expect(useWorkersStore.getState().workers[0].id).toBe('w1');
  });

  it('addWorker triggers refetch', async () => {
    const rfMock = vi.fn();
    useWorkersStore.setState({ fetchWorkers: rfMock });

    await useWorkersStore.getState().addWorker({ name: 'W1' });
    expect(WorkersRepository.add).toHaveBeenCalled();
    expect(rfMock).toHaveBeenCalled();
  });

  it('updateWorker optimistically updates', async () => {
    useWorkersStore.setState({ workers: [{ id: 'w1', name: 'Old' } as any] });
    
    await useWorkersStore.getState().updateWorker('w1', { name: 'New' });
    expect(useWorkersStore.getState().workers[0].name).toBe('New');
    expect(WorkersRepository.update).toHaveBeenCalledWith('w1', { name: 'New' });
  });

  it('updateWorker rollbacks on error', async () => {
    useWorkersStore.setState({ workers: [{ id: 'w1', name: 'Old' } as any] });
    vi.mocked(WorkersRepository.update).mockRejectedValue(new Error('fail'));

    await useWorkersStore.getState().updateWorker('w1', { name: 'New' });
    expect(useWorkersStore.getState().workers[0].name).toBe('Old'); 
  });

  it('deleteWorker optimistically updates', async () => {
    useWorkersStore.setState({ workers: [{ id: 'w1' }, { id: 'w2' }] as any });
    
    await useWorkersStore.getState().deleteWorker('w1');
    expect(useWorkersStore.getState().workers.length).toBe(1);
    expect(WorkersRepository.delete).toHaveBeenCalledWith('w1');
  });

  it('deleteWorker rollbacks on error', async () => {
    useWorkersStore.setState({ workers: [{ id: 'w1' }] as any });
    vi.mocked(WorkersRepository.delete).mockRejectedValue(new Error('fail'));

    await useWorkersStore.getState().deleteWorker('w1');
    expect(useWorkersStore.getState().workers.length).toBe(1); 
  });
});
