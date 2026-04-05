import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TablesRepository } from './TablesRepository';
import { pb } from '../pocketbase';

vi.mock('../pocketbase', () => ({
  pb: {
    collection: vi.fn(),
  },
}));

describe('TablesRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchAll() should correctly map PocketBase records to Table objects', async () => {
    const mockRecords = [
      {
        id: 'table_1',
        number: 5,
        seats: 4,
        zone: 'terrace',
        position_x: 100,
        position_y: 200,
        is_active: true,
      },
      {
        id: 'table_2',
        number: 10,
        // Проверяем fallback-значения
        is_active: false,
      }
    ];

    const mockGetFullList = vi.fn().mockResolvedValue(mockRecords);
    vi.mocked(pb.collection).mockReturnValue({ getFullList: mockGetFullList } as any);

    const result = await TablesRepository.fetchAll();

    expect(pb.collection).toHaveBeenCalledWith('tables');
    expect(mockGetFullList).toHaveBeenCalledWith({ sort: 'number' });

    expect(result).toHaveLength(2);
    
    // Проверяем полную модель
    expect(result[0]).toEqual({
      id: 'table_1',
      number: 5,
      seats: 4,
      zone: 'terrace',
      position_x: 100,
      position_y: 200,
      isActive: true,
    });

    // Проверяем fallback-логику
    expect(result[1]).toEqual({
      id: 'table_2',
      number: 10,
      seats: 1, // fallback default
      zone: '', // fallback default
      position_x: 0,
      position_y: 0,
      isActive: false, // явный фолс
    });
  });

  it('create() should map camelCase to snake_case and return mapped Table', async () => {
    const mockCreatedRecord = {
      id: 'new_id',
      number: 7,
      seats: 2,
      zone: 'main',
      position_x: 50,
      position_y: 50,
      is_active: true
    };

    const mockCreate = vi.fn().mockResolvedValue(mockCreatedRecord);
    vi.mocked(pb.collection).mockReturnValue({ create: mockCreate } as any);

    const payload = { number: 7, seats: 2, zone: 'main' };
    const result = await TablesRepository.create(payload as any);

    // Убеждаемся что в базу ушли правильные snake_case ключи + fallback
    expect(mockCreate).toHaveBeenCalledWith({
      number: 7,
      seats: 2,
      zone: 'main',
      position_x: 0,
      position_y: 0,
      is_active: true,
    });

    // Убеждаемся что вернулся camelCase
    expect(result).toEqual({
      id: 'new_id',
      number: 7,
      seats: 2,
      zone: 'main',
      position_x: 50,
      position_y: 50,
      isActive: true,
    });
  });

  it('delete() should correctly call collection.delete', async () => {
    const mockDelete = vi.fn().mockResolvedValue(true);
    vi.mocked(pb.collection).mockReturnValue({ delete: mockDelete } as any);

    await TablesRepository.delete('t_123');

    expect(pb.collection).toHaveBeenCalledWith('tables');
    expect(mockDelete).toHaveBeenCalledWith('t_123');
  });

  it('update() should correctly map frontend fields to snake_case payload', async () => {
    const mockUpdate = vi.fn().mockResolvedValue(true);
    vi.mocked(pb.collection).mockReturnValue({ update: mockUpdate } as any);

    await TablesRepository.update('t_99', {
      number: '8',
      position_x: 200,
      isActive: false
    });

    expect(mockUpdate).toHaveBeenCalledWith('t_99', {
      number: "8",
      position_x: 200,
      is_active: false
    });
  });
});

