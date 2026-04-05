import { describe, it, expect, vi } from 'vitest';
import { NotificationsRepository } from './notifications';
import { pb } from '../pocketbase';

vi.mock('../pocketbase', () => ({
  pb: { collection: vi.fn() },
}));

describe('NotificationsRepository', () => {
  it('fetchAll() should return unread notifications', async () => {
    const mockList = [{ id: 'not1', message: 'Hello' }];
    vi.mocked(pb.collection).mockReturnValue({ getFullList: vi.fn().mockResolvedValue(mockList) } as any);
    
    const res = await NotificationsRepository.fetchAll();
    expect(res).toEqual(mockList);
  });

  it('notify() creates a notification', async () => {
    const create = vi.fn();
    vi.mocked(pb.collection).mockReturnValue({ create } as any);

    await NotificationsRepository.notify('Warn', 'Low stock', 'stock_alert');
    expect(create).toHaveBeenCalledWith({
      title: 'Warn',
      message: 'Low stock',
      type: 'stock_alert',
      is_read: false
    });
  });

  it('markAsRead() updates read status', async () => {
    const update = vi.fn();
    vi.mocked(pb.collection).mockReturnValue({ update } as any);

    await NotificationsRepository.markAsRead('not1');
    expect(update).toHaveBeenCalledWith('not1', { is_read: true });
  });
});
