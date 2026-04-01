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
}

export interface MenuCategory {
  id: string;
  name: string;
  orderIndex: number;
}

export type OrderStatus = 'new' | 'preparing' | 'ready' | 'delivering' | 'completed' | 'cancelled';

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
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  hours: string;
  address: string;
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DbRow = Record<string, any>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DbValues = any[];

