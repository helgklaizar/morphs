import type { OrderStatus } from '@rms/core';

export const STATUS_CONFIG: Record<OrderStatus, { label: string, colorClass: string, hex: string }> = {
  new: { label: 'Новый', colorClass: 'text-orange-500 bg-orange-500', hex: '#FF6B00' },
  preparing: { label: 'Готовится', colorClass: 'text-amber-500 bg-amber-500', hex: '#FFC107' },
  ready: { label: 'Готов', colorClass: 'text-[#00C853] bg-[#00C853]', hex: '#00C853' },
  delivering: { label: 'У курьера', colorClass: 'text-blue-500 bg-blue-500', hex: '#3B82F6' },
  completed: { label: 'Выполнен', colorClass: 'text-gray-500 bg-gray-500', hex: '#6B7280' },
  cancelled: { label: 'Отменён', colorClass: 'text-red-500 bg-red-500', hex: '#EF4444' },
  pending: { label: 'Ожидание', colorClass: 'text-gray-400 bg-gray-400', hex: '#9CA3AF' },
};
