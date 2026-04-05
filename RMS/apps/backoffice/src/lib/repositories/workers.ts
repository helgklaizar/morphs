import { pb } from '../pocketbase';

export interface Worker {
  id: string;
  name: string;
  role: string;
  hourly_rate: number;
  phone: string;
  status: string;
  created: string;
  updated: string;
}

export class WorkersRepository {
  static async fetchAll(): Promise<Worker[]> {
    const records = await pb.collection('workers').getFullList({
      sort: '-created',
    });

    return records.map((row: any) => ({
      id: row.id,
      name: row.name || '',
      role: row.role || '',
      hourly_rate: row.hourly_rate || 0,
      phone: row.phone || '',
      status: row.status || 'active',
      created: row.created,
      updated: row.updated,
    }));
  }

  static async add(worker: Partial<Worker>): Promise<void> {
    await pb.collection('workers').create({
      name: worker.name,
      role: worker.role,
      hourly_rate: worker.hourly_rate,
      phone: worker.phone,
      status: worker.status || 'active',
    });
  }

  static async update(id: string, payload: Partial<Worker>): Promise<void> {
    const updateData: any = {};
    if (payload.name !== undefined) updateData.name = payload.name;
    if (payload.role !== undefined) updateData.role = payload.role;
    if (payload.hourly_rate !== undefined) updateData.hourly_rate = payload.hourly_rate;
    if (payload.phone !== undefined) updateData.phone = payload.phone;
    if (payload.status !== undefined) updateData.status = payload.status;
    
    await pb.collection('workers').update(id, updateData);
  }

  static async delete(id: string): Promise<void> {
    await pb.collection('workers').delete(id);
  }
}
