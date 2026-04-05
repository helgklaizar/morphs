import { pb } from '../pocketbase';

export interface WasteRecord {
  id: string;
  inventory_item_id: string;
  quantity: number;
  reason: string;
  created: string;
  expand?: {
    inventory_item_id?: {
      name: string;
      price: number;
    }
  }
}

export class WasteRepository {
  static async fetchAll(): Promise<WasteRecord[]> {
    const records = await pb.collection('waste').getFullList({
      sort: '-created',
      expand: 'inventory_item_id',
    });
    return records as unknown as WasteRecord[];
  }

  static async addWaste(item: Partial<WasteRecord>): Promise<void> {
    await pb.collection('waste').create(item);
    
    // Update inventory quantity
    if (item.inventory_item_id && item.quantity) {
      const currentItem = await pb.collection('inventory_items').getOne(item.inventory_item_id);
      const newQty = Math.max(0, (currentItem.quantity || 0) - item.quantity);
      await pb.collection('inventory_items').update(item.inventory_item_id, {
        quantity: newQty
      });
    }
  }
}
