import { z } from 'zod';

export const recipeIngredientSchema = z.object({
  inventoryItemId: z.string().min(1),
  quantity: z.number().min(0),
});

export const recipeSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Название обязательно"),
  yield: z.number().min(0).default(1),
  ingredients: z.array(recipeIngredientSchema).min(1, "Добавьте хотя бы один ингредиент"),
});

export type RecipeInput = z.infer<typeof recipeSchema>;
