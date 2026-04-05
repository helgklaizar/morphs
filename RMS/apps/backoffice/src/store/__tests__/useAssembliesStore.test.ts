import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAssembliesStore } from '../useAssembliesStore';
import { AssembliesRepository } from '@/lib/repositories/assemblies';

vi.mock('@/lib/repositories/assemblies', () => ({
  AssembliesRepository: {
    fetchAll: vi.fn(),
    add: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
}));

describe('useAssembliesStore', () => {
  beforeEach(() => {
    useAssembliesStore.setState({ assemblies: [], isLoading: true, error: null });
    vi.clearAllMocks();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('fetchAssemblies', async () => {
    vi.mocked(AssembliesRepository.fetchAll).mockResolvedValue([{ id: 'asm1' }] as any);
    await useAssembliesStore.getState().fetchAssemblies();
    expect(useAssembliesStore.getState().assemblies[0].id).toBe('asm1');
  });

  it('addAssembly', async () => {
    const rfMock = vi.fn();
    useAssembliesStore.setState({ fetchAssemblies: rfMock });

    await useAssembliesStore.getState().addAssembly('Kit', []);
    expect(AssembliesRepository.add).toHaveBeenCalledWith('Kit', []);
    expect(rfMock).toHaveBeenCalled();
  });

  it('updateAssembly', async () => {
    const rfMock = vi.fn();
    useAssembliesStore.setState({ fetchAssemblies: rfMock });

    await useAssembliesStore.getState().updateAssembly('asm1', 'Kit', []);
    expect(AssembliesRepository.update).toHaveBeenCalledWith('asm1', 'Kit', []);
    expect(rfMock).toHaveBeenCalled();
  });

  it('deleteAssembly', async () => {
    const rfMock = vi.fn();
    useAssembliesStore.setState({ fetchAssemblies: rfMock });

    await useAssembliesStore.getState().deleteAssembly('asm1');
    expect(AssembliesRepository.delete).toHaveBeenCalledWith('asm1');
    expect(rfMock).toHaveBeenCalled();
  });
});
