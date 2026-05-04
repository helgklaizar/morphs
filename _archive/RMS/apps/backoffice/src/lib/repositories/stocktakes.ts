import { pb } from '../pocketbase';

export interface StocktakeItemRecord {
  id: string;
  stocktake_id: string;
  inventory_item_id: string;
  expected_quantity: number;
  actual_quantity: number;
  difference: number;
  expand?: {
    inventory_item_id: {
      name: string;
    }
  }
}

export interface StocktakeRecord {
  id: string;
  status: 'draft' | 'completed';
  notes: string;
  created: string;
  calculatedLoss?: number;
  calculatedSurplus?: number;
  expand?: {
    'stocktake_items(stocktake_id)'?: StocktakeItemRecord[];
  }
}

export class StocktakesRepository {
  static async fetchAll(): Promise<StocktakeRecord[]> {
    const records = await pb.collection('stocktakes').getFullList({
      sort: '-created',
      expand: 'stocktake_items(stocktake_id).inventory_item_id',
    });
    
    // Внедряем быстрый вызов для подсчета убытков, чтобы использовать в Аналитике
    return records.map((record: any) => {
      let totalLoss = 0;
      let totalSurplus = 0;

      const items = record.expand?.['stocktake_items(stocktake_id)'] || [];
      items.forEach((item: any) => {
        const price = item.expand?.inventory_item_id?.price || 0;
        const diff = item.difference || 0;
        // difference < 0 = недостача (на складе меньше, чем ожидалось)
        if (diff < 0) {
          totalLoss += Math.abs(diff) * price;
        } else if (diff > 0) {
          totalSurplus += diff * price;
        }
      });

      return {
        ...record,
        calculatedLoss: totalLoss,
        calculatedSurplus: totalSurplus
      };
    }) as unknown as StocktakeRecord[];
  }

  static async create(items: Partial<StocktakeItemRecord>[]): Promise<void> {
    const hdr = await pb.collection('stocktakes').create({
      status: 'completed',
      notes: `Inventory check at ${new Date().toLocaleString()}`,
    });
    
    for (const item of items) {
      await pb.collection('stocktake_items').create({
        stocktake_id: hdr.id,
        ...item
      });
      
      // Update inventory item quantity to match actual
      if (item.inventory_item_id) {
        await pb.collection('inventory_items').update(item.inventory_item_id, {
          quantity: item.actual_quantity
        });
      }
    }
  }
}
