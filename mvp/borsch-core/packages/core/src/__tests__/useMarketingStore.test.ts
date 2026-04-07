import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useMarketingStore } from '../store/useMarketingStore';
import { pb } from '@rms/db-local';

vi.mock('@rms/db-local', () => ({
  pb: {
    collection: vi.fn(),
  }
}));

const mockCollection = (methods: Record<string, any>) => {
  vi.mocked(pb.collection).mockReturnValue(methods as any);
};

describe('useMarketingStore', () => {
  beforeEach(() => {
    useMarketingStore.setState({ campaigns: [], providers: [], isLoading: true, error: null, draftMediaLink: null });
    vi.clearAllMocks();
  });

  it('fetchCampaigns — загружает кампании из PocketBase', async () => {
    const mockData = [{ id: 'm1', name: 'Promo', status: 'draft', expand: {} }];
    mockCollection({ getFullList: vi.fn().mockResolvedValue(mockData) });

    await useMarketingStore.getState().fetchCampaigns();

    expect(pb.collection).toHaveBeenCalledWith('marketing_campaigns');
    expect(useMarketingStore.getState().campaigns[0].id).toBe('m1');
    expect(useMarketingStore.getState().isLoading).toBe(false);
  });

  it('fetchCampaigns — 404 возвращает пустой список', async () => {
    const notFoundErr = { status: 404 };
    mockCollection({ getFullList: vi.fn().mockRejectedValue(notFoundErr) });

    await useMarketingStore.getState().fetchCampaigns();

    expect(useMarketingStore.getState().campaigns).toEqual([]);
    expect(useMarketingStore.getState().isLoading).toBe(false);
  });

  it('addCampaign — создаёт кампанию через PocketBase', async () => {
    const mockCreate = vi.fn().mockResolvedValue({ id: 'new1' });
    // fetchCampaigns вызывается после create
    const mockGetFullList = vi.fn().mockResolvedValue([]);
    vi.mocked(pb.collection).mockReturnValue({ create: mockCreate, getFullList: mockGetFullList } as any);

    await useMarketingStore.getState().addCampaign({ name: 'New Promo' });

    expect(mockCreate).toHaveBeenCalledWith({ status: 'draft', name: 'New Promo' });
  });

  it('deleteCampaign — удаляет кампанию через PocketBase', async () => {
    const mockDelete = vi.fn().mockResolvedValue({});
    const mockGetFullList = vi.fn().mockResolvedValue([]);
    vi.mocked(pb.collection).mockReturnValue({ delete: mockDelete, getFullList: mockGetFullList } as any);

    await useMarketingStore.getState().deleteCampaign('c1');

    expect(mockDelete).toHaveBeenCalledWith('c1');
  });

  it('setDraftMediaLink — устанавливает ссылку', () => {
    useMarketingStore.getState().setDraftMediaLink('https://example.com/img.jpg');
    expect(useMarketingStore.getState().draftMediaLink).toBe('https://example.com/img.jpg');
  });
});
