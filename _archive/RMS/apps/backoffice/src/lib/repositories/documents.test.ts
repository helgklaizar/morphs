import { describe, it, expect, vi } from 'vitest';
import { DocumentsRepository } from './documents';
import { pb } from '../pocketbase';

vi.mock('../pocketbase', () => ({
  pb: { collection: vi.fn() },
}));

describe('DocumentsRepository', () => {
  it('fetchAll() should return documents list', async () => {
    const mockList = [{ id: 'doc1' }];
    vi.mocked(pb.collection).mockReturnValue({ getFullList: vi.fn().mockResolvedValue(mockList) } as any);
    const res = await DocumentsRepository.fetchAll();
    expect(res).toEqual(mockList);
  });

  it('upload() should append formData correctly', async () => {
    const mockCreate = vi.fn();
    vi.mocked(pb.collection).mockReturnValue({ create: mockCreate } as any);

    const blob = new Blob(['test']);
    await DocumentsRepository.upload('Doc Name', 'Invoice', blob, 'work1', 'sup1');
    
    expect(mockCreate).toHaveBeenCalled();
    const args = mockCreate.mock.calls[0][0];
    expect(args).toBeInstanceOf(FormData);
    expect(args.get('name')).toBe('Doc Name');
    expect(args.get('worker_id')).toBe('work1');
  });

  it('delete() drops document', async () => {
    const mockDel = vi.fn();
    vi.mocked(pb.collection).mockReturnValue({ delete: mockDel } as any);
    await DocumentsRepository.delete('doc1');
    expect(mockDel).toHaveBeenCalledWith('doc1');
  });
});
