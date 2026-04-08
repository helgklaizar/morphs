import { z } from 'zod';

export const createMenuCategorySchema = z.object({
  name: z.string().min(1),
  nameEn: z.string().optional(),
  nameHe: z.string().optional(),
  nameUk: z.string().optional(),
  orderIndex: z.number().int().default(0),
});

export const updateMenuCategorySchema = createMenuCategorySchema.partial();

export const menuItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  price: z.number().min(0),
  cost: z.number().min(0).default(0),
  stock: z.number().int().default(0),
  isActive: z.boolean().default(true),
  imageUrl: z.string().optional().nullable(),
  isPoll: z.boolean().default(false),
  categoryId: z.string().optional().nullable(),
  kitchenDepartment: z.string().optional().nullable(),
  isPrep: z.boolean().default(false),
  unit: z.string().default("шт"),
  writeOffOnProduce: z.boolean().default(false),
  recipeId: z.string().optional().nullable(),
});

export const createMenuItemSchema = menuItemSchema;
export const updateMenuItemSchema = menuItemSchema.partial();
