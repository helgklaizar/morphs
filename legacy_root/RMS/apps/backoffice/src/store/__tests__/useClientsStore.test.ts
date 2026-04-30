import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useClientsStore } from '../useClientsStore';
import { ClientsRepository } from '@/lib/repositories/clients';

vi.mock('@/lib/repositories/clients', () => ({
  ClientsRepository: {
    fetchAll: vi.fn(),
    add: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
}));

describe('useClientsStore', () => {
  beforeEach(() => {
    useClientsStore.setState({ clients: [], isLoading: true, error: null });
    vi.clearAllMocks();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('fetchClients', async () => {
    vi.mocked(ClientsRepository.fetchAll).mockResolvedValue([{ id: 'c1' }] as any);
    await useClientsStore.getState().fetchClients();
    expect(useClientsStore.getState().clients[0].id).toBe('c1');
  });

  it('addClient triggers refetch', async () => {
    const rfMock = vi.fn();
    useClientsStore.setState({ fetchClients: rfMock });

    await useClientsStore.getState().addClient({ name: 'Alice', phone: '123', address: 'Home' });
    expect(ClientsRepository.add).toHaveBeenCalled();
    expect(rfMock).toHaveBeenCalled();
  });

  it('updateClient triggers refetch', async () => {
    const rfMock = vi.fn();
    useClientsStore.setState({ fetchClients: rfMock });

    await useClientsStore.getState().updateClient('c1', { name: 'Bob' });
    expect(ClientsRepository.update).toHaveBeenCalledWith('c1', { name: 'Bob' });
    expect(rfMock).toHaveBeenCalled();
  });

  it('deleteClient removes optimistically', async () => {
    useClientsStore.setState({ clients: [{ id: 'c1' } as any] });

    await useClientsStore.getState().deleteClient('c1');
    expect(useClientsStore.getState().clients.length).toBe(0);
    expect(ClientsRepository.delete).toHaveBeenCalledWith('c1');
  });

  it('deleteClient restores state on error', async () => {
    useClientsStore.setState({ clients: [{ id: 'c1' } as any] });
    vi.mocked(ClientsRepository.delete).mockRejectedValue(new Error('fail'));

    await useClientsStore.getState().deleteClient('c1');
    expect(useClientsStore.getState().clients.length).toBe(1); // Restored
  });
});
