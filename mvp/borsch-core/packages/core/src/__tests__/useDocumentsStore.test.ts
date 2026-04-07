import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useDocumentsStore } from '../store/useDocumentsStore';
import { DocumentsRepository } from '@rms/db-local';

vi.mock('@rms/db-local', () => ({
  DocumentsRepository: {
    fetchAll: vi.fn(),
    upload: vi.fn(),
    delete: vi.fn()
  }
}));

describe('useDocumentsStore', () => {
  beforeEach(() => {
    useDocumentsStore.setState({ docs: [], isLoading: true, error: null });
    vi.clearAllMocks();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('fetchDocs', async () => {
    vi.mocked(DocumentsRepository.fetchAll).mockResolvedValue([{ id: 'd1' }] as any);
    await useDocumentsStore.getState().fetchDocs();
    expect(useDocumentsStore.getState().docs).toEqual([{ id: 'd1' }]);
  });

  it('uploadDoc triggers refetch', async () => {
    const rfMock = vi.fn();
    useDocumentsStore.setState({ fetchDocs: rfMock });

    await useDocumentsStore.getState().uploadDoc('A', 'B', new Blob() as any);
    expect(DocumentsRepository.upload).toHaveBeenCalled();
    expect(rfMock).toHaveBeenCalled();
  });

  it('deleteDoc', async () => {
    const rfMock = vi.fn();
    useDocumentsStore.setState({ fetchDocs: rfMock });

    await useDocumentsStore.getState().deleteDoc('d2');
    expect(DocumentsRepository.delete).toHaveBeenCalledWith('d2');
    expect(rfMock).toHaveBeenCalled();
  });
});
