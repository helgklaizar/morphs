import { pb } from '../pocketbase';

export interface SupplierRecord {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  category: string;
  notes: string;
  hours?: string;
  preferred_language?: string;
}

export class SuppliersRepository {
  static async fetchAll(): Promise<SupplierRecord[]> {
    const records = await pb.collection('suppliers').getFullList();
    return records as unknown as SupplierRecord[];
  }

  static async add(payload: Partial<SupplierRecord>): Promise<void> {
    await pb.collection('suppliers').create(payload);
  }

  static async update(id: string, payload: Partial<SupplierRecord>): Promise<void> {
    await pb.collection('suppliers').update(id, payload);
  }
  
  static async delete(id: string): Promise<void> {
    await pb.collection('suppliers').delete(id);
  }
}
