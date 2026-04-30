import { InventoryCategory, Assembly, Recipe, Order } from '@rms/types';

// Универсальные моки склада для UI-тестов модальных окон
export const mockInventoryCategories: InventoryCategory[] = [
  {
    id: 'cat_veg',
    name: 'Овощи',
    isVisibleInAssemblies: false,
    isVisibleInRecipe: true,
    orderIndex: 0,
    items: [
      { id: 'inv_1', name: 'Картофель', price: 50, recipeUnit: 'г', unit: 'кг', quantity: 10, categoryId: 'cat_veg', yieldPerUnit: 1000 },
      { id: 'inv_2', name: 'Морковь', price: 60, recipeUnit: 'г', unit: 'кг', quantity: 5, categoryId: 'cat_veg', yieldPerUnit: 1000 },
    ]
  },
  {
    id: 'cat_pack',
    name: 'Упаковка',
    isVisibleInAssemblies: true,
    isVisibleInRecipe: false,
    orderIndex: 1,
    items: [
      { id: 'inv_box', name: 'Коробка средняя', price: 200, recipeUnit: 'шт', unit: 'уп', packSize: 100, quantity: 2, categoryId: 'cat_pack', yieldPerUnit: 100 },
      { id: 'inv_sticker', name: 'Наклейка RMS', price: 50, recipeUnit: 'шт', unit: 'рулон', packSize: 500, quantity: 1, categoryId: 'cat_pack', yieldPerUnit: 500 },
    ]
  }
];

// Универсальные моки сборок
export const mockAssemblies: Assembly[] = [
  {
    id: 'asm_1',
    name: 'Набор суповой',
    totalCost: 2.5,
    items: [
      { id: 'asm_item_1', name: 'Коробка средняя', quantity: 1, unit: 'шт', inventoryItemId: 'inv_box' },
      { id: 'asm_item_2', name: 'Наклейка RMS', quantity: 1, unit: 'шт', inventoryItemId: 'inv_sticker' }
    ]
  }
];

// Универсальные моки рецептов
export const mockRecipes: Recipe[] = [
  {
    id: 'rec_1',
    name: 'Борщ Классический',
    portions: 10,
    ingredients: [
      { id: 'rec_ing_1', recipeId: 'rec_1', inventoryItemId: 'inv_1', quantity: 500, inventoryItem: { name: 'Картофель', unit: 'кг', price: 50, recipeUnit: 'г', yieldPerUnit: 1000 } },
      { id: 'rec_ing_2', recipeId: 'rec_1', inventoryItemId: 'inv_2', quantity: 200, inventoryItem: { name: 'Морковь', unit: 'кг', price: 60, recipeUnit: 'г', yieldPerUnit: 1000 } }
    ]
  }
];
