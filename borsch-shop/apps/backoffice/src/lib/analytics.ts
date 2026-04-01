import { useMemo } from "react";
import { Order, OrderStatus } from "@/store/useOrdersStore";
import { MenuItem } from "@/store/useMenuStore";
import { InventoryCategory } from "@/store/useInventoryStore";
import { Recipe } from "@/store/useRecipesStore";
import { Assembly } from "@/store/useAssembliesStore";

export interface AnalyticsData {
  totalRevenue: number;
  netProfit: number;
  cashRevenue: number;
  bitRevenue: number;
  completedOrdersCount: number;
  cancelledOrdersCount: number;
  totalInventoryCapital: number;
  inventoryCapitalByCategory: Record<string, number>;
  topSellingDishes: { name: string; count: number }[];
  topProfitableDishes: { name: string; profit: number }[];
  mostUsedIngredients: { name: string; cost: number }[];
  ordersByHour: { hour: string; count: number }[];
}

export function computeAnalytics(
  allOrders: Order[],
  menuItems: MenuItem[],
  inventoryCategories: InventoryCategory[],
  recipes: Recipe[],
  assemblies: Assembly[]
): AnalyticsData {
  let totalRevenue = 0;
  let cashRevenue = 0;
  let bitRevenue = 0;
  let totalCostOfGoods = 0;
  let completedOrdersCount = 0;
  let cancelledOrdersCount = 0;

  const dishSalesCount: Record<string, number> = {};
  const dishTotalProfit: Record<string, number> = {};
  const ingredientCosts: Record<string, number> = {};
  const ordersByHourMap: Record<number, number> = {};

  const menuMap = new Map(menuItems.map(m => [m.id, m]));
  const recipeMap = new Map(recipes.map(r => [r.id, r]));
  const assemblyMap = new Map(assemblies.map(a => [a.id, a]));

  const allItems = inventoryCategories.flatMap(c => c.items);
  const inventoryMap = new Map(allItems.map(i => [i.id, i]));
  const idToCategoryName = new Map(allItems.map(i => {
    const cat = inventoryCategories.find(c => c.id === i.categoryId);
    return [i.id, cat?.name || "Без категории"] as const;
  }));

  for (const order of allOrders) {
    if (order.status === 'cancelled') {
      cancelledOrdersCount++;
      continue;
    }

    if (order.status === 'completed') {
      completedOrdersCount++;
      totalRevenue += order.totalAmount;
      if (order.paymentMethod === 'cash') cashRevenue += order.totalAmount;
      else bitRevenue += order.totalAmount;

      const hour = new Date(order.createdAt).getHours();
      ordersByHourMap[hour] = (ordersByHourMap[hour] || 0) + 1;

      for (const item of order.items) {
        dishSalesCount[item.menuItemName] = (dishSalesCount[item.menuItemName] || 0) + item.quantity;
        
        let itemFoodCost = 0;
        
        // FIND MENU ITEM
        // The store currently does not save menuItemId into the item object for orders?
        // Wait, OrderItem in store has only id (order item id), menuItemName, quantity.
        // It DOES NOT have menuItemId in useOrdersStore!
        // But we can look it up by name
        const menuItem = menuItems.find(m => m.name === item.menuItemName);

        if (menuItem) {
          if (menuItem.recipeId) {
            const recipe = recipeMap.get(menuItem.recipeId);
            if (recipe) {
              const portionCost = recipe.ingredients.reduce((acc, ing) => {
                const iItem = inventoryMap.get(ing.inventoryItemId);
                if (iItem) {
                  const cost = ing.quantity * iItem.price;
                  ingredientCosts[iItem.name] = (ingredientCosts[iItem.name] || 0) + (cost * item.quantity / recipe.portions);
                  return acc + cost;
                }
                return acc;
              }, 0) / recipe.portions;
              itemFoodCost += portionCost;
            }
          } else if (menuItem.assemblyId) {
            const assembly = assemblyMap.get(menuItem.assemblyId);
            if (assembly) {
              const assemblyCost = assembly.items.reduce((acc, ing) => {
                const iItem = inventoryMap.get(ing.inventoryItemId);
                if (iItem) {
                  const cost = ing.quantity * iItem.price;
                  ingredientCosts[iItem.name] = (ingredientCosts[iItem.name] || 0) + cost * item.quantity;
                  return acc + cost;
                }
                return acc;
              }, 0);
              itemFoodCost += assemblyCost;
            }
          }
        }

        const totalItemCost = itemFoodCost * item.quantity;
        totalCostOfGoods += totalItemCost;

        // Approximate item price if we don't have priceAtTime in the store
        // Let's use menuItem price or try to guess from totalAmount (fallback)
        // If order total is 100, and 1 item...
        // Safest is to use menuItem.price
        const itemRevenue = (menuItem?.price || 0) * item.quantity;
        dishTotalProfit[item.menuItemName] = (dishTotalProfit[item.menuItemName] || 0) + (itemRevenue - totalItemCost);
      }
    }
  }

  // Inventory capital
  let totalInventoryCapital = 0;
  const inventoryCapitalByCategory: Record<string, number> = {};

  for (const inv of allItems) {
    const cap = inv.price * inv.quantity;
    totalInventoryCapital += cap;
    const catName = idToCategoryName.get(inv.id) || "Без категории";
    inventoryCapitalByCategory[catName] = (inventoryCapitalByCategory[catName] || 0) + cap;
  }

  return {
    totalRevenue,
    netProfit: totalRevenue - totalCostOfGoods,
    cashRevenue,
    bitRevenue,
    completedOrdersCount,
    cancelledOrdersCount,
    totalInventoryCapital,
    inventoryCapitalByCategory,
    topSellingDishes: Object.entries(dishSalesCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    topProfitableDishes: Object.entries(dishTotalProfit)
      .map(([name, profit]) => ({ name, profit }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 10),
    mostUsedIngredients: Object.entries(ingredientCosts)
      .map(([name, cost]) => ({ name, cost }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10),
    ordersByHour: Object.entries(ordersByHourMap)
      .map(([h, c]) => ({ hour: `${h}:00 - ${parseInt(h)+1}:00`, count: c }))
      .sort((a, b) => b.count - a.count)
  };
}
