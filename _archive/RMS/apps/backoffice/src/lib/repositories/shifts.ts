import { pb } from '../pocketbase';

export interface ShiftRecord {
  id: string;
  worker_id: string;
  start_time: string;
  end_time?: string;
  total_hours: number;
  total_pay: number;
  created: string;
  expand?: {
    worker_id: {
      name: string;
      role: string;
      hourly_rate: number;
    }
  }
}

export class ShiftsRepository {
  static async fetchAll(): Promise<ShiftRecord[]> {
    const records = await pb.collection('shifts').getFullList({
      sort: '-start_time',
      expand: 'worker_id',
    });
    return records as unknown as ShiftRecord[];
  }

  static async startShift(workerId: string): Promise<void> {
    await pb.collection('shifts').create({
      worker_id: workerId,
      start_time: new Date().toISOString(),
    });
  }

  static async endShift(id: string, startTime: string, hourlyRate: number): Promise<void> {
    const startAt = new Date(startTime);
    const endAt = new Date();
    const diffMs = endAt.getTime() - startAt.getTime();
    const hours = diffMs / (1000 * 60 * 60);

    let baseHours = hours;
    let overtimeHours = 0;

    // Сверхурочные: всё что больше 8 часов
    if (hours > 8) {
      baseHours = 8;
      overtimeHours = hours - 8;
    }

    // Ночной коэффициент (если смена затронула период 22:00 - 06:00)
    const startH = startAt.getHours();
    const endH = endAt.getHours();
    const isNightShift = (startH >= 22 || startH < 6) || (endH >= 22 || endH < 6);
    
    const nightMultiplier = isNightShift ? 1.5 : 1.0; // Ночные +50%
    const overtimeMultiplier = 1.25; // Сверхурочные +25%

    const basePay = baseHours * (hourlyRate || 0) * nightMultiplier;
    const overtimePay = overtimeHours * (hourlyRate || 0) * overtimeMultiplier * nightMultiplier;
    const pay = basePay + overtimePay;

    await pb.collection('shifts').update(id, {
      end_time: endAt.toISOString(),
      total_hours: hours,
      total_pay: pay,
    });
  }
}
