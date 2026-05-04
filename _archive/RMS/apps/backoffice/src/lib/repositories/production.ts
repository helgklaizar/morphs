import { pb } from '../pocketbase';

/**
 * Производство заготовки (Menu Item с is_prep = true).
 * @param prepMenuItemId ID заготовки (блюда).
 * @param produceAmount Сколько единиц произвели.
 */
export async function producePreparation(prepMenuItemId: string, produceAmount: number) {
  // 1. Получаем меню-итем заготовки
  const prepItem = await pb.collection('menu_items').getOne(prepMenuItemId);
  if (!prepItem.recipe_id) throw new Error("У заготовки нет привязанного рецепта.");

  // 2. Получаем сам рецепт
  const recipe = await pb.collection('recipes').getOne(prepItem.recipe_id);
  const ratio = produceAmount / (recipe.portions || 1); // сколько "замесов" мы делаем

  // 3. Рекурсивно собираем все необходимые сырые ингредиенты со склада
  const requiredStock: Record<string, number> = {};

  async function resolveIngredients(recipeId: string, currentRatio: number) {
    const ingredients = await pb.collection('recipe_ingredients').getFullList({
      filter: pb.filter('recipe_id = {:id}', { id: recipeId }),
    });

    for (const ing of ingredients) {
      if (ing.inventory_item_id) {
        // Обычный продукт со склада
        const req = ing.quantity * currentRatio;
        requiredStock[ing.inventory_item_id] = (requiredStock[ing.inventory_item_id] || 0) + req;
      } else if (ing.nested_recipe_id) {
        // Вложенный ПФ: это значит мы должны развернуть его тоже!
        // ВАЖНО: При варке заготовки "из под ножа" мы всегда списываем СЫРЬЕ вложенных заготовок.
        // Если мы хотим списывать готовую вложенную заготовку (как позицию), то архитектура сложнее.
        // Но обычно в ресторане производство списывает базовое сырье.
        // Давайте получим рецепт вложенного ПФ.
        const nestedRecipe = await pb.collection('recipes').getOne(ing.nested_recipe_id);
        const subRatio = (ing.quantity * currentRatio) / (nestedRecipe.portions || 1);
        await resolveIngredients(ing.nested_recipe_id, subRatio);
      }
    }
  }

  await resolveIngredients(recipe.id, ratio);

  // 4. Списываем со склада всё собранное сырье
  for (const [inventoryId, qty] of Object.entries(requiredStock)) {
    const item = await pb.collection('inventory_items').getOne(inventoryId);
    await pb.collection('inventory_items').update(inventoryId, {
      stock: (item.stock || 0) - qty,
    });
  }

  // 5. Пополняем остаток самой заготовки
  await pb.collection('menu_items').update(prepMenuItemId, {
    stock: (prepItem.stock || 0) + produceAmount,
  });
}
