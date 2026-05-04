import { pb } from '../pocketbase';

export interface DocumentRecord {
  id: string;
  name: string;
  type: string;
  file?: string;
  worker_id?: string;
  supplier_id?: string;
  created: string;
  expand?: {
    worker_id?: { name: string };
    supplier_id?: { name: string };
  }
}

export class DocumentsRepository {
  static async fetchAll(): Promise<DocumentRecord[]> {
    const records = await pb.collection('documents').getFullList({
      sort: '-created',
      expand: 'worker_id,supplier_id',
    });
    return records as unknown as DocumentRecord[];
  }

  static async upload(name: string, type: string, file: File | Blob, workerId?: string, supplierId?: string): Promise<void> {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('type', type);
    formData.append('file', file);
    if (workerId) formData.append('worker_id', workerId);
    if (supplierId) formData.append('supplier_id', supplierId);
    
    await pb.collection('documents').create(formData);
  }

  static async delete(id: string): Promise<void> {
    await pb.collection('documents').delete(id);
  }
}
