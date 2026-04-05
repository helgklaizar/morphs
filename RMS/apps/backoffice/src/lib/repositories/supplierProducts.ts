import { pb } from '../pocketbase';

export interface SupplierProductRecord {
  id: string;
  supplier_id: string; // mapped to supplier
  name: string;      
  image_url: string;
  notes: string;
  prices: Record<string, number>; 
}

export interface SupplierOrderRecord {
  id: string;
  supplier_id: string;
  status: string;
  sent_via: string;
  total_amount: number;
  created: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    unit: string;
    price: number;
  }>;
  expand?: {
    supplier: {
      name: string;
      email: string;
      phone: string;
    }
  }
}

export class SupplierProductsRepository {
  static async fetchProducts(supplierId: string): Promise<SupplierProductRecord[]> {
    try {
        const records = await pb.collection('inventory_items').getFullList({
          filter: pb.filter('supplier = {:id}', { id: supplierId }),
          sort: 'name',
        });
        
        return records.map((r: any) => ({
           id: r.id,
           supplier_id: r.supplier,
           name: r.name,
           image_url: r.image_data || '',
           notes: '',
           prices: { [r.unit || "уп"]: r.price || 0 }
        }));
    } catch(e) { return []; }
  }

  static async fetchOrders(supplierId: string): Promise<SupplierOrderRecord[]> {
      try {
        const records = await pb.collection('supplier_orders').getFullList({
          filter: pb.filter('supplier = {:id}', { id: supplierId }),
          sort: '-created',
          expand: 'supplier',
        });
        return records as unknown as SupplierOrderRecord[];
      } catch(e) { return []; }
  }

  static async addProduct(payload: Partial<SupplierProductRecord>): Promise<void> {
    const unitPriceKeys = Object.keys(payload.prices || {});
    const unit = unitPriceKeys[0] || 'шт';
    const price = payload.prices ? payload.prices[unit] : 0;
    
    await pb.collection('inventory_items').create({
        supplier: payload.supplier_id,
        name: payload.name,
        unit: unit,
        price: price,
        stock: 0,
        min_stock: 0,
        pack_size: 1
    });
  }

  static async deleteProduct(id: string): Promise<void> {
    await pb.collection('inventory_items').delete(id);
  }

  static async createOrder(supplierId: string, items: any[], via: string): Promise<SupplierOrderRecord> {
    const totalAmount = items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0);
    const record = await pb.collection('supplier_orders').create({
      supplier: supplierId,
      status: 'sent',
      sent_via: via,
      items: items,
      total_amount: totalAmount,
    });
    return record as unknown as SupplierOrderRecord;
  }
}
