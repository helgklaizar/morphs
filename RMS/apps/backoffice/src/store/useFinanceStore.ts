import { create } from 'zustand';
import { pb } from '@/lib/pocketbase';

export interface FinanceCategory {
  id: string;
  name: string;
  type: 'income' | 'expense';
  is_tax_deductible: boolean;
}

export interface FinanceTransaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  category_id: string;
  category?: FinanceCategory; // expanded
  date: string;
  description: string;
  receipt_url?: string;
  has_maam: boolean;
  created: string;
  is_synthetic?: boolean;
}

interface FinanceState {
  transactions: FinanceTransaction[];
  categories: FinanceCategory[];
  isLoading: boolean;
  fetchTransactions: (month?: string) => Promise<void>;
  fetchCategories: () => Promise<void>;
  addCategory: (data: Partial<FinanceCategory>) => Promise<void>;
  addTransaction: (data: Partial<FinanceTransaction>, file?: File) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  transactions: [],
  categories: [],
  isLoading: false,

  fetchCategories: async () => {
    try {
      const records = await pb.collection('finance_categories').getFullList({ sort: 'name' });
      set({ categories: records as any });
    } catch (e) {
      console.error(e);
    }
  },

  fetchTransactions: async (monthStr) => {
    set({ isLoading: true });
    try {
      // monthStr in format YYYY-MM
      // Compute real last day of month to avoid -31 bug (Feb, Apr, Jun, Sep, Nov)
      const getMonthEnd = (ym: string) => {
        const [y, m] = ym.split('-').map(Number);
        return new Date(y, m, 0).getDate(); // day 0 of next month = last day of current
      };

      let filter = "";
      if (monthStr) {
        const lastDay = getMonthEnd(monthStr);
        filter = `date >= '${monthStr}-01' && date <= '${monthStr}-${lastDay}'`;
      }
      
      const records = await pb.collection('finance_transactions').getFullList({
        filter,
        sort: '-date',
        expand: 'category_id'
      });
      
      const mapped: FinanceTransaction[] = records.map((r: any) => ({
        id: r.id,
        amount: r.amount,
        type: r.type,
        category_id: r.category_id,
        category: r.expand?.category_id,
        date: r.date,
        description: r.description,
        receipt_url: r.receipt_file ? pb.files.getUrl(r, r.receipt_file) : undefined,
        has_maam: r.has_maam,
        created: r.created,
        is_synthetic: false
      }));

      // --- ADD ORDERS AGGREGATION (Income & Courier/Wolt/10bis Expenses) ---
      let orderFilter = "status = 'completed' || status = 'delivered'";
      if (monthStr) {
        const lastDay = getMonthEnd(monthStr);
        orderFilter = `(status = 'completed' || status = 'delivered') && created >= '${monthStr}-01 00:00:00' && created <= '${monthStr}-${lastDay} 23:59:59'`;
      }
      const orderRecords = await pb.collection('orders').getFullList({ filter: orderFilter });
      
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
          id: `income-orders-${date}`, amount: ordersByDay[date], type: 'income', category_id: 'auto-sales', category: { id: 'auto-sales', name: 'Выручка (ЦМС/Касса)', type: 'income', is_tax_deductible: false }, date: date, description: `Выручка за кассовый день: ${date}`, has_maam: true, created: date, is_synthetic: true
        });
      });
      Object.keys(woltCommByDay).forEach(date => {
        mapped.push({
          id: `exp-wolt-${date}`, amount: woltCommByDay[date], type: 'expense', category_id: 'auto-wolt', category: { id: 'auto-wolt', name: 'Комиссия платформы (Wolt)', type: 'expense', is_tax_deductible: true }, date: date, description: `Комиссия Wolt (30%) за ${date}`, has_maam: true, created: date, is_synthetic: true
        });
      });
      Object.keys(tenbisCommByDay).forEach(date => {
        mapped.push({
          id: `exp-10bis-${date}`, amount: tenbisCommByDay[date], type: 'expense', category_id: 'auto-10bis', category: { id: 'auto-10bis', name: 'Комиссия платформы (10bis)', type: 'expense', is_tax_deductible: true }, date: date, description: `Комиссия 10bis (10%) за ${date}`, has_maam: true, created: date, is_synthetic: true
        });
      });
      Object.keys(courierByDay).forEach(date => {
        mapped.push({
          id: `exp-courier-${date}`, amount: courierByDay[date], type: 'expense', category_id: 'auto-courier', category: { id: 'auto-courier', name: 'Частный курьер (Фикс)', type: 'expense', is_tax_deductible: false }, date: date, description: `Оплата курьерам за ${date}`, has_maam: false, created: date, is_synthetic: true
        });
      });

      // --- ADD SHIFTS AGGREGATION (Payroll Expenses) ---
      let shiftFilter = "end_time != '' && end_time != null";
      if (monthStr) {
        const lastDay = getMonthEnd(monthStr);
        shiftFilter = `end_time != '' && end_time != null && start_time >= '${monthStr}-01 00:00:00' && start_time <= '${monthStr}-${lastDay} 23:59:59'`;
      }
      try {
        const shiftRecords = await pb.collection('shifts').getFullList({ filter: shiftFilter });
        const shiftsByDay: Record<string, number> = {};
        shiftRecords.forEach((s: any) => {
          const date = s.start_time.substring(0, 10);
          shiftsByDay[date] = (shiftsByDay[date] || 0) + (s.total_pay || 0);
        });
        
        Object.keys(shiftsByDay).forEach(date => {
          if (shiftsByDay[date] > 0) {
            mapped.push({
              id: `exp-shifts-${date}`, amount: shiftsByDay[date], type: 'expense', category_id: 'auto-shifts', category: { id: 'auto-shifts', name: 'ФОТ (Зарплаты)', type: 'expense', is_tax_deductible: true }, date: date, description: `Зарплаты персонала за смены: ${date}`, has_maam: false, created: date, is_synthetic: true
            });
          }
        });
      } catch (err) {
        console.warn("Could not fetch shifts for finance aggregation", err);
      }

      // --- ADD SUPPLIER ORDERS (Expenses by confirmation) ---
      let supFilter = "status = 'received'";
      if (monthStr) {
        const lastDay = getMonthEnd(monthStr);
        supFilter = `status = 'received' && created >= '${monthStr}-01 00:00:00' && created <= '${monthStr}-${lastDay} 23:59:59'`;
      }
      const supRecords = await pb.collection('supplier_orders').getFullList({ filter: supFilter, expand: 'supplier_id' });
      
      supRecords.forEach((so: any) => {
        mapped.push({
          id: so.id, // Using real ID so wait, synthetic? Yes, it's synthetic in finance context
          amount: so.total_amount || 0,
          type: 'expense',
          category_id: 'auto-procurement',
          category: { id: 'auto-procurement', name: 'Закупки (Поставщики)', type: 'expense', is_tax_deductible: true },
          date: so.created.substring(0, 10),
          description: `Накладная от: ${so.expand?.supplier_id?.name || 'Неизвестный поставщик'}`,
          has_maam: true, // Assuming invoice includes VAT
          created: so.created,
          is_synthetic: true
        });
      });

      // Sort everything by date desc
      mapped.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      set({ transactions: mapped, isLoading: false });
    } catch (e) {
      console.error(e);
      set({ isLoading: false });
    }
  },

  addCategory: async (data) => {
    try {
      await pb.collection('finance_categories').create(data);
      // reload categories
      get().fetchCategories();
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  addTransaction: async (data, file) => {
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });
      if (file) {
        formData.append('receipt_file', file);
      }

      await pb.collection('finance_transactions').create(formData);
      get().fetchTransactions();
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  deleteTransaction: async (id) => {
    try {
      await pb.collection('finance_transactions').delete(id);
      get().fetchTransactions();
    } catch (e) {
      console.error(e);
      throw e;
    }
  }
}));
