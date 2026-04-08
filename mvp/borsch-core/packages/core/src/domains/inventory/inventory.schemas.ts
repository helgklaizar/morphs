import { z } from 'zod';

export const inventoryItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Название обязательно"),
  unit: z.enum(['кг', 'л', 'шт', 'упак']).default('кг'),
  stock: z.number().min(0).default(0),
  costPerUnit: z.number().min(0).default(0),
  minStock: z.number().min(0).default(0),
  categoryId: z.string().nullable().optional(),
});

export const inventoryCategorySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Название обязательно"),
  orderIndex: z.number().optional(),
});

export type InventoryItemInput = z.infer<typeof inventoryItemSchema>;
export type InventoryCategoryInput = z.infer<typeof inventoryCategorySchema>;
