import { z } from 'zod';

export const orderItemSchema = z.object({
  menuItemId: z.string().min(1),
  menuItemName: z.string().min(1),
  quantity: z.number().positive(),
  priceAtTime: z.number().min(0)
});

export const createOrderSchema = z.object({
  customerName: z.string().optional().default("Guest"),
  customerPhone: z.string().optional().default(""),
  status: z.string().optional().default("new"),
  totalAmount: z.number().min(0),
  paymentMethod: z.string().optional().default("cash"),
  reservationDate: z.string().optional().nullable(),
  tableId: z.string().optional().nullable(),
  items: z.array(orderItemSchema).min(1)
});

export const updateOrderStatusSchema = z.object({
  status: z.string().min(1)
});

export const updateOrderSchema = z.object({
  isArchived: z.boolean().optional(),
  status: z.string().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  paymentMethod: z.string().optional(),
});
