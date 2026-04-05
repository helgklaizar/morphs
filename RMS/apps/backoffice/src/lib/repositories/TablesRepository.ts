import { pb } from '../pocketbase';
import { Table } from '@rms/types';

export class TablesRepository {
  static async fetchAll(): Promise<Table[]> {
    const records = await pb.collection('tables').getFullList({
      sort: 'number',
    });

    return records.map(r => ({
      id: r.id,
      number: r.number || '',
      seats: r.seats || 1,
      zone: r.zone || '',
      position_x: r.position_x || 0,
      position_y: r.position_y || 0,
      isActive: r.is_active === true,
    }));
  }

  static async create(payload: Partial<Table>): Promise<Table> {
    const record = await pb.collection('tables').create({
      number: payload.number || '',
      seats: payload.seats || 1,
      zone: payload.zone || '',
      position_x: payload.position_x || 0,
      position_y: payload.position_y || 0,
      is_active: payload.isActive ?? true,
    });

    return {
      id: record.id,
      number: record.number,
      seats: record.seats,
      zone: record.zone,
      position_x: record.position_x,
      position_y: record.position_y,
      isActive: record.is_active,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static async update(id: string, payload: Partial<Table>): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {};
    if (payload.number !== undefined) updateData.number = payload.number;
    if (payload.seats !== undefined) updateData.seats = payload.seats;
    if (payload.zone !== undefined) updateData.zone = payload.zone;
    if (payload.position_x !== undefined) updateData.position_x = payload.position_x;
    if (payload.position_y !== undefined) updateData.position_y = payload.position_y;
    if (payload.isActive !== undefined) updateData.is_active = payload.isActive;

    await pb.collection('tables').update(id, updateData);
  }

  static async delete(id: string): Promise<void> {
    await pb.collection('tables').delete(id);
  }
}
