import { ShiftRecord } from './shifts';

const generateId = () => Math.random().toString(36).substring(2, 17);

const recordOutboxEvent = async (db: any, action: string, payload: any) => {
  const id = generateId();
  await db.execute(
    `INSERT INTO outbox_events (id, entity_type, action, payload_json, status) VALUES ($1, $2, $3, $4, $5)`,
    [id, 'shifts', action, JSON.stringify(payload), 'pending']
  );
};

export class LocalShiftsRepository {
  static async fetchAll(): Promise<ShiftRecord[]> {
    const { getDb } = await import('@rms/db-local');
    const db = await getDb();
    
    // SQLite LEFT JOIN to mimic Pocketbase auto-expand
    const query = `
      SELECT 
        s.*,
        w.name as worker_name, 
        w.role as worker_role, 
        w.rate_per_hour as worker_rate
      FROM shifts s
      LEFT JOIN workers w ON s.worker_id = w.id
      ORDER BY s.start_time DESC
    `;
    const records = await db.select<any[]>(query);
    
    return records.map((row: any) => ({
      id: row.id,
      worker_id: row.worker_id,
      start_time: row.start_time,
      end_time: row.end_time || undefined,
      total_hours: row.total_hours || 0,
      total_pay: row.total_pay || 0,
      created: row.created_at,
      expand: {
        worker_id: {
          name: row.worker_name || 'Неизвестно',
          role: row.worker_role || '',
          hourly_rate: row.worker_rate || 0,
        }
      }
    }));
  }

  static async startShift(workerId: string): Promise<void> {
    const { getDb } = await import('@rms/db-local');
    const db = await getDb();
    const id = generateId();
    const startTime = new Date().toISOString();
    
    await db.execute(
      `INSERT INTO shifts (id, worker_id, start_time, status) VALUES ($1, $2, $3, 'open')`,
      [id, workerId, startTime]
    );
    
    await recordOutboxEvent(db, 'shift_start', { id, worker_id: workerId, start_time: startTime });
  }

  static async endShift(id: string, startTime: string, hourlyRate: number): Promise<void> {
    const { getDb } = await import('@rms/db-local');
    const db = await getDb();
    
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

    const endTimeIso = endAt.toISOString();

    await db.execute(
      `UPDATE shifts SET end_time=$1, total_hours=$2, total_pay=$3, status='closed' WHERE id=$4`,
      [endTimeIso, hours, pay, id]
    );

    await recordOutboxEvent(db, 'shift_end', {
      id,
      end_time: endTimeIso,
      total_hours: hours,
      total_pay: pay
    });
  }
}
