import { FinanceTransaction } from '@rms/types';

export const getMonthEnd = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m, 0).getDate(); // day 0 of next month = last day of current
};

export const mapFinanceTransaction = (r: any): FinanceTransaction => ({
  id: r.id,
  amount: r.amount,
  type: r.type,
  category_id: r.category_id,
  category: r.expand?.category_id,
  date: r.date,
  description: r.description,
  receipt_url: r.receipt_file ? `...` : undefined, // Note: receipt_url needs pb.files.getUrl, we can pass it as a callback or just map it in the store
  has_maam: r.has_maam,
  created: r.created,
  is_synthetic: false
});

export const getOrderAggregations = (orderRecords: any[]): FinanceTransaction[] => {
  const mapped: FinanceTransaction[] = [];
  const ordersByDay: Record<string, number> = {};
  const woltCommByDay: Record<string, number> = {};
  const tenbisCommByDay: Record<string, number> = {};
  const courierByDay: Record<string, number> = {};

  orderRecords.forEach((o: any) => {
    const date = o.created.substring(0, 10);
    const amount = typeof o.total_price === 'number' ? o.total_price : (o.totalAmount || 0);
    ordersByDay[date] = (ordersByDay[date] || 0) + amount;

    const pm = o.paymentMethod || o.payment_method;
    if (pm === 'wolt') {
      woltCommByDay[date] = (woltCommByDay[date] || 0) + (amount * 0.30); // 30% commission
    } else if (pm === '10bis') {
      tenbisCommByDay[date] = (tenbisCommByDay[date] || 0) + (amount * 0.10); // 10% commission
    } else if (pm === 'courier' || pm === 'courier_bit') {
      courierByDay[date] = (courierByDay[date] || 0) + 30; // 30 NIS fixed price
    }
  });

  Object.keys(ordersByDay).forEach(date => {
    mapped.push({
      id: `income-orders-${date}`, amount: ordersByDay[date], type: 'income', category_id: 'auto-sales', category: { id: 'auto-sales', name: 'Выручка (ЦМС/Касса)', type: 'income', is_tax_deductible: false } as any, date: date, description: `Выручка за кассовый день: ${date}`, has_maam: true, created: date, is_synthetic: true
    });
  });
  Object.keys(woltCommByDay).forEach(date => {
    mapped.push({
      id: `exp-wolt-${date}`, amount: woltCommByDay[date], type: 'expense', category_id: 'auto-wolt', category: { id: 'auto-wolt', name: 'Комиссия платформы (Wolt)', type: 'expense', is_tax_deductible: true } as any, date: date, description: `Комиссия Wolt (30%) за ${date}`, has_maam: true, created: date, is_synthetic: true
    });
  });
  Object.keys(tenbisCommByDay).forEach(date => {
    mapped.push({
      id: `exp-10bis-${date}`, amount: tenbisCommByDay[date], type: 'expense', category_id: 'auto-10bis', category: { id: 'auto-10bis', name: 'Комиссия платформы (10bis)', type: 'expense', is_tax_deductible: true } as any, date: date, description: `Комиссия 10bis (10%) за ${date}`, has_maam: true, created: date, is_synthetic: true
    });
  });
  Object.keys(courierByDay).forEach(date => {
    mapped.push({
      id: `exp-courier-${date}`, amount: courierByDay[date], type: 'expense', category_id: 'auto-courier', category: { id: 'auto-courier', name: 'Частный курьер (Фикс)', type: 'expense', is_tax_deductible: false } as any, date: date, description: `Оплата курьерам за ${date}`, has_maam: false, created: date, is_synthetic: true
    });
  });

  return mapped;
};

export const getShiftAggregations = (shiftRecords: any[]): FinanceTransaction[] => {
  const mapped: FinanceTransaction[] = [];
  const shiftsByDay: Record<string, number> = {};
  shiftRecords.forEach((s: any) => {
    const date = s.start_time.substring(0, 10);
    shiftsByDay[date] = (shiftsByDay[date] || 0) + (s.total_pay || 0);
  });
  
  Object.keys(shiftsByDay).forEach(date => {
    if (shiftsByDay[date] > 0) {
      mapped.push({
        id: `exp-shifts-${date}`, amount: shiftsByDay[date], type: 'expense', category_id: 'auto-shifts', category: { id: 'auto-shifts', name: 'ФОТ (Зарплаты)', type: 'expense', is_tax_deductible: true } as any, date: date, description: `Зарплаты персонала за смены: ${date}`, has_maam: false, created: date, is_synthetic: true
      });
    }
  });
  return mapped;
};

export const getSupplierAggregations = (supRecords: any[]): FinanceTransaction[] => {
  const mapped: FinanceTransaction[] = [];
  supRecords.forEach((so: any) => {
    mapped.push({
      id: so.id,
      amount: so.total_amount || 0,
      type: 'expense',
      category_id: 'auto-procurement',
      category: { id: 'auto-procurement', name: 'Закупки (Поставщики)', type: 'expense', is_tax_deductible: true } as any,
      date: so.created.substring(0, 10),
      description: `Накладная от: ${so.expand?.supplier_id?.name || 'Неизвестный поставщик'}`,
      has_maam: true, 
      created: so.created,
      is_synthetic: true
    });
  });
  return mapped;
};
