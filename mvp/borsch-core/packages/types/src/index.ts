export interface InventoryItem {
  id: string;
  name: string;
  price: number;
  unit: string;
  quantity: number;
  categoryId: string;
  supplier?: string;
  packSize?: number;
  recipeUnit?: string | null;
  yieldPerUnit?: number | null;
}

export interface InventoryCategory {
  id: string;
  name: string;
  isVisibleInAssemblies: boolean;
  isVisibleInRecipe: boolean;
  orderIndex: number;
  items: InventoryItem[];
}

export interface RecipeIngredient {
  id: string;
  recipeId: string;
  inventoryItemId: string;
  quantity: number;
  inventoryItem?: {
    name: string;
    unit: string;
    price: number;
    recipeUnit?: string | null;
    yieldPerUnit?: number | null;
  };
}

export interface Recipe {
  id: string;
  name: string;
  portions: number;
  ingredients: RecipeIngredient[];
}

export interface AssemblyItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  inventoryItemId: string;
}

export interface Assembly {
  id: string;
  name: string;
  totalCost: number;
  items: AssemblyItem[];
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
  calories?: number;
  categoryName?: string;
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

export type OrderStatus = 'pending' | 'new' | 'preparing' | 'ready' | 'delivering' | 'completed' | 'cancelled';

export interface OrderItem {
  id: string;
  menuItemName: string;
  quantity: number;
  priceAtTime?: number;
  menuItemId?: string;
  orderId?: string;
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

export interface Table {
  id: string;
  number: string;
  seats: number;
  zone: string;
  position_x: number;
  position_y: number;
  isActive: boolean;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  hours: string;
  address: string;
  preferredLanguage?: string;
}

export interface SupplierProduct {
  id: string;
  supplierId: string;
  inventoryItemId: string;
  supplierPrice: number;
}

export interface SupplierOrder {
  id: string;
  supplierId: string;
  inventoryItemId: string;
  quantity: number;
  status: 'ordered' | 'received' | 'cancelled';
  createdAt: string;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image_url: string;
  quantity: number;
  stock: number;
}

export interface MarketingProvider {
  id: string;
  name: string;
  contract_type?: 'one-time' | 'budget';
  rating?: number;
}

export interface MarketingCampaign {
  id: string;
  name: string;
  status: string;
  provider_id?: string;
  text_content?: string;
  media_link?: string;
  budget?: number;
  comments?: string;
  rating?: number;
  expand?: {
    provider_id?: MarketingProvider;
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DbRow = Record<string, any>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DbValues = any[];


export * from './legacy-store';

export type Client = import('./pocketbase-types').ClientRecord;
export type Shift = import('./pocketbase-types').ShiftRecord;
export type Stocktake = import('./pocketbase-types').StocktakeRecord;


export type InsightType = 'tip' | 'warning' | 'success' | 'action';
export interface AiInsight { id: string; type: InsightType; text: string; action?: { label: string; onClick: () => void | Promise<void>; }; }
