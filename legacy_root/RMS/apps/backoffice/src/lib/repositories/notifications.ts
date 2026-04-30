import { pb } from '../pocketbase';

export interface NotificationRecord {
  id: string;
  type: 'price_warning' | 'stock_alert' | 'system';
  title: string;
  message: string;
  is_read: boolean;
  created: string;
}

export class NotificationsRepository {
  static async fetchAll(): Promise<NotificationRecord[]> {
    const records = await pb.collection('notifications').getFullList({
      sort: '-created',
      filter: 'is_read = false'
    });
    return records as unknown as NotificationRecord[];
  }

  static async notify(title: string, message: string, type: NotificationRecord['type'] = 'system'): Promise<void> {
    await pb.collection('notifications').create({
      title,
      message,
      type,
      is_read: false
    });
  }

  static async markAsRead(id: string): Promise<void> {
    await pb.collection('notifications').update(id, { is_read: true });
  }
}
