import { 
    StocktakeItemRecord, StocktakeRecord, SupplierProductRecord, SupplierOrderRecord,
    AssemblyRecord, AssemblyItemRecord, ShiftRecord, SupplierRecord, ClientRecord, DocumentRecord
} from './pocketbase-types';

export type AdvisorModule = 'crm' | 'menu' | 'dashboard' | 'inventory' | 'tables';

export interface AiMessage {
  id: string;
  text: string;
  sender: Sender;
  isLoading?: boolean;
  imagePath?: string;
}

export type Sender = 'user' | 'ai' | 'system';

export type Assembly = AssemblyRecord;

export type AssemblyItem = AssemblyItemRecord;

export type Client = ClientRecord;

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

export interface PointTransaction {
  id: string;
  clientId: string;
  amount: number; // positive = added, negative = spent
  reason: string;
  createdAt: string;
}

export interface LoyaltySettings {
  enabled: boolean;
  baseCashbackPercent: number;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  cost: number;
  description: string;
  stock: number;
  isActive: boolean;
  image: string;
  isPoll: boolean;
  recipeId?: string;
  assemblyId?: string;
  categoryId?: string;
  categoryName?: string;
  calories?: number;
  kitchenDepartment?: string;
  isPrep?: boolean;
  unit?: string;
  writeOffOnProduce?: boolean;
}

export interface MenuCategory {
  id: string;
  name: string;
  orderIndex: number;
}

export interface ModuleDefinition {
  id: SystemModuleId;
  label: string;
  description: string;
  defaultEnabled: boolean;
  required?: boolean;
}

export interface OrderItem {
  id: string;
  menuItemName: string;
  quantity: number;
  priceAtTime?: number;
  menuItemId?: string;
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
  reservationDate?: string;
  paymentMethod: string;
  items: OrderItem[];
  isArchived: boolean;
  tableId?: string;
}

export type OrderStatus = 'new' | 'preparing' | 'ready' | 'delivering' | 'completed' | 'cancelled' | 'pending';

export interface PlaybookTask {
  id: string;
  tab: PlaybookTab;
  column: PlaybookColumnType;
  content: string;
  isCompleted: boolean;
  order: number;
}

export type PlaybookTab = 'kitchen' | 'bar' | 'floor' | 'manager';

export type PlaybookColumnType = 'opening' | 'shift_change' | 'closing';

export interface ProcurementSuggestion {
  inventoryItemId: string;
  name: string;
  supplier: string;
  currentStock: number;
  minStock: number;
  suggestedOrderQty: number;
  estimatedCost: number;
  burnPerDay?: number;
  daysLeft?: number;
}

export interface SupplierOrderDraft {
  id: string;
  supplier_id: string;
  supplierName?: string;
  status: string;
  total_amount: number;
  items: string; // JSON string
  created: string;
}

export interface Promocode {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  isActive: boolean;
  uses: number;
  maxUses: number | null;
  createdAt: string;
}

export type Shift = ShiftRecord;

export type StocktakeItem = StocktakeItemRecord;

export type Stocktake = StocktakeRecord;

export type SupplierProduct = SupplierProductRecord;

export type SupplierOrder = SupplierOrderRecord;

export type Supplier = SupplierRecord;

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface TranslationItem {
  id: string;
  type: 'menu' | 'category' | 'general';
  key: string; // For general it's the key, for menu/category it's the original name
  originalName: string;
  originalDesc?: string;
  en: string;
  he: string;
  uk: string;
  // Aliases for the TranslationsPage
  nameEn: string;
  nameHe: string;
  nameUk: string;
  descEn: string;
  descHe: string;
  descUk: string;
}

export type SystemModuleId = 'pos' | 'orders' | 'tables' | 'crm' | 'marketing' | 'inventory' | 'kitchen' | 'finances' | 'reports' | 'settings' | 'ai' | 'procurement' | 'workers' | 'analytics' | 'menu' | 'procurement' | 'workers' | 'analytics' | 'menu';
