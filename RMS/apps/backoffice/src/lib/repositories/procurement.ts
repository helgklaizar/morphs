import { pb } from '../pocketbase';

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

export class ProcurementRepository {
  /**
   * Анализирует запасы и историю продаж, чтобы предложить закупку
   */
  static async suggestPurchases(): Promise<ProcurementSuggestion[]> {
    try {
      const items = await pb.collection('inventory_items').getFullList();
      const menuItems = await pb.collection('menu_items').getFullList();
      
      // Загружаем рецепты через RecipesRepository (чтобы использовать готовую логику с expand)
      const { RecipesRepository } = await import('./recipes');
      const allRecipes = await RecipesRepository.fetchAll();
      
      // Получаем заказы за последние 7 дней
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const recentOrderItems = await pb.collection('order_items').getFullList({
        filter: `created >= "${sevenDaysAgo.toISOString().replace('T', ' ')}"`
      });

      // Хэш-карта расхода ингредиентов
      const burns: Record<string, number> = {};

      for (const orderItem of recentOrderItems) {
        const menuItem = menuItems.find(m => m.id === orderItem.menu_item_id);
        if (!menuItem || !menuItem.recipe_id) continue;

        const recipe = allRecipes.find(r => r.id === menuItem.recipe_id);
        if (!recipe) continue;

        // Рассчитываем расход на 1 единицу блюда
        for (const ing of recipe.ingredients) {
          if (!ing.inventoryItemId) continue;
          
          const usagePerDish = ing.quantity / (recipe.portions || 1);
          const totalUsage = usagePerDish * (orderItem.quantity || 1);
          
          burns[ing.inventoryItemId] = (burns[ing.inventoryItemId] || 0) + totalUsage;
        }
      }
      
      const suggestions: ProcurementSuggestion[] = [];

      for (const item of items) {
        const currentStock = Number(item.stock ?? 0);
        const minStock = Number(item.min_stock ?? 0);
        const price = Number(item.price ?? 0);
        const packSize = Number(item.pack_size ?? 1);

        const burnIn7Days = burns[item.id] || 0;
        const burnPerDay = burnIn7Days / 7;
        const daysLeft = burnPerDay > 0 ? (currentStock / burnPerDay) : 999;

        // Прогноз AI: если остатка хватит меньше чем на 4 дня ИЛИ текущий сток ниже минимального
        // Или если прогноз расхода на 10 дней вперед превышает текущий запас
        const forecastUsage10Days = burnPerDay * 10;
        const needsRestock = (minStock > 0 && currentStock <= minStock) || 
                            (burnPerDay > 0 && daysLeft <= 4.0) ||
                            (forecastUsage10Days > currentStock && burnPerDay > 0.1);

        if (needsRestock) {
          // Цель: покрыть расход на 10 дней + минимальный запас
          const usageBasedTarget = forecastUsage10Days * 1.15; // 15% запас на волатильность
          const targetStock = Math.max(minStock * 2, usageBasedTarget);
          
          let deficit = targetStock - currentStock;
          if (deficit < 0) deficit = 0;
          
          // Округляем до упаковок
          const packsNeeded = Math.ceil(deficit / packSize);
          const suggestedOrderQty = packsNeeded * packSize;

          if (suggestedOrderQty > 0) {
            suggestions.push({
              inventoryItemId: item.id,
              name: item.name || 'Неизвестно',
              supplier: item.supplier || 'Не указан',
              currentStock,
              minStock,
              suggestedOrderQty,
              estimatedCost: suggestedOrderQty * price,
              burnPerDay: Number(burnPerDay.toFixed(2)),
              daysLeft: Number(daysLeft.toFixed(1))
            });
          }
        }
      }

      return suggestions;
    } catch (e) {
      console.error('Failed to generate procurement suggestions:', e);
      return [];
    }
  }

  /**
   * Создает черновики заказов поставщикам
   */
  static async createDraftOrders(suggestions: ProcurementSuggestion[]): Promise<void> {
    // Группируем по поставщикам
    const bySupplier = suggestions.reduce((acc, curr) => {
      const sup = curr.supplier || 'Без поставщика';
      if (!acc[sup]) acc[sup] = [];
      acc[sup].push(curr);
      return acc;
    }, {} as Record<string, ProcurementSuggestion[]>);

    for (const [supplierName, sugs] of Object.entries(bySupplier)) {
      // Ищем поставщика, чтобы получить его ID (опционально, если supplierName это строка)
      let supplierId = '';
      try {
        const supRecord = await pb.collection('suppliers').getFirstListItem(`name='${supplierName.replace(/'/g, "\\'")}'`);
        supplierId = supRecord.id;
      } catch (e) {
        // Если поставщик не найден в справочнике, создаем псевдо-заказ без строгой привязки
        console.warn(`Supplier ${supplierName} not found in DB`);
      }

      const totalAmount = sugs.reduce((sum, item) => sum + item.estimatedCost, 0);

      // Форматируем items как JSON строку для таблицы supplier_orders (поле items TEXT)
      const itemsPayload = JSON.stringify(sugs.map(s => ({
        inventory_item_id: s.inventoryItemId,
        name: s.name,
        quantity: s.suggestedOrderQty,
        estimated_cost: s.estimatedCost
      })));

      try {
        await pb.collection('supplier_orders').create({
          supplier_id: supplierId,
          status: 'draft',
          total_amount: totalAmount,
          items: itemsPayload
        });
      } catch (err) {
        console.error('Failed to create supplier order draft:', err);
      }
    }
  }
}
