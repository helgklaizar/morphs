import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTranslationsStore } from '../useTranslationsStore';
import { pb } from '@/lib/pocketbase';

vi.mock('@/lib/pocketbase', () => ({
  pb: {
    collection: vi.fn()
  }
}));

describe('useTranslationsStore', () => {
  beforeEach(() => {
    useTranslationsStore.setState({ items: [], translations: [], isLoading: true, error: null });
    vi.clearAllMocks();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('fetchTranslations load from multiple collections', async () => {
    const mockGetFullList = vi.fn()
      .mockResolvedValueOnce([{ id: 'm1', name: 'RMS', name_en: 'RMSEn' }]) // menu
      .mockResolvedValueOnce([{ id: 'c1', name: 'Soups', name_en: 'SoupsEn' }]) // cats
      .mockResolvedValueOnce([{ id: 'g1', key: 'Welcome', en: 'Welcome' }]); // general
    
    vi.mocked(pb.collection).mockReturnValue({ getFullList: mockGetFullList } as any);

    await useTranslationsStore.getState().fetchTranslations();
    
    const items = useTranslationsStore.getState().items;
    expect(items.length).toBe(3);
    expect(items[0].type).toBe('menu');
    expect(items[1].type).toBe('category');
    expect(items[2].type).toBe('general');
  });

  it('addTranslation', async () => {
    const mockCreate = vi.fn();
    const mockGetFullList = vi.fn().mockResolvedValue([]);
    vi.mocked(pb.collection).mockImplementation((collName: string) => ({
      create: mockCreate,
      getFullList: mockGetFullList
    } as any));

    await useTranslationsStore.getState().addTranslation({ key: 'Hello', en: 'Hi' });
    
    expect(pb.collection).toHaveBeenCalledWith('translations');
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ key: 'Hello', en: 'Hi' }));
  });

  it('updateTranslation updates menu items correctly', async () => {
    const mockUpdate = vi.fn();
    const mockGetFullList = vi.fn().mockResolvedValue([]);
    vi.mocked(pb.collection).mockImplementation(() => ({
      update: mockUpdate,
      getFullList: mockGetFullList
    } as any));

    await useTranslationsStore.getState().updateTranslation('m1', 'menu', { nameEn: 'NewName' });
    
    expect(pb.collection).toHaveBeenCalledWith('menu_items');
    expect(mockUpdate).toHaveBeenCalledWith('m1', expect.objectContaining({ name_en: 'NewName' }));
  });

  it('deleteTranslation', async () => {
    const mockDel = vi.fn();
    const mockGetFullList = vi.fn().mockResolvedValue([]);
    vi.mocked(pb.collection).mockImplementation(() => ({
      delete: mockDel,
      getFullList: mockGetFullList
    } as any));

    await useTranslationsStore.getState().deleteTranslation('t1');
    expect(pb.collection).toHaveBeenCalledWith('translations');
    expect(mockDel).toHaveBeenCalledWith('t1');
  });
});
