import { useMemo } from "react";
import { Order, OrderStatus } from "@/store/useOrdersStore";
import { MenuItem } from "@/store/useMenuStore";
import { InventoryCategory } from "@/store/useInventoryStore";
import { Recipe } from "@/store/useRecipesStore";
import { Assembly } from "@/store/useAssembliesStore";
import { Shift } from "@/store/useShiftsStore";
import { WasteRecord } from "@/store/useWasteStore";

export interface AnalyticsData {
  totalRevenue: number;
  netProfit: number; // Gross profit (Revenue - COGS)
  realNetProfit: number; // Net profit (Revenue - COGS - Staff - Waste)
  totalStaffCosts: number;
  totalWasteCosts: number;
  cashRevenue: number;
  bitRevenue: number;
  deliveryRevenue: number;
  completedOrdersCount: number;
  cancelledOrdersCount: number;
  totalInventoryCapital: number;
  inventoryCapitalByCategory: Record<string, number>;
  topSellingDishes: { name: string; count: number }[];
  topProfitableDishes: { name: string; profit: number }[];
  mostUsedIngredients: { name: string; cost: number }[];
  ordersByHour: { hour: string; count: number }[];
  subscriptionRevenue: number;
  subscriptionOrdersCount: number;
  subscriptionDeliveryRevenue: number;
  subscriptionPickupRevenue: number;
  subscriptionCashRevenue: number;
  subscriptionBitRevenue: number;
}

export function computeAnalytics(
  allOrders: Order[],
  menuItems: MenuItem[],
  inventoryCategories: InventoryCategory[],
  recipes: Recipe[],
  assemblies: Assembly[],
  shifts: Shift[] = [],
  wasteRecords: WasteRecord[] = []
): AnalyticsData {
  let totalRevenue = 0;
  let cashRevenue = 0;
  let bitRevenue = 0;
  let deliveryRevenue = 0;
  let totalCostOfGoods = 0;
  let completedOrdersCount = 0;
  let cancelledOrdersCount = 0;

  let subscriptionRevenue = 0;
  let subscriptionOrdersCount = 0;
  let subscriptionDeliveryRevenue = 0;
  let subscriptionPickupRevenue = 0;
  let subscriptionCashRevenue = 0;
  let subscriptionBitRevenue = 0;

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

    if ((order.status as any) !== 'cancelled') {
      if (order.status === 'completed') completedOrdersCount++;
      totalRevenue += order.totalAmount;
      if (order.paymentMethod === 'cash') cashRevenue += order.totalAmount;
      else bitRevenue += order.totalAmount;

      if (order.customerName && order.customerName.includes("[Доставка]")) {
         deliveryRevenue += order.totalAmount;
      }

      const isSubscription = order.customerName && order.customerName.toLowerCase().includes("подписка");
      if (isSubscription && order.status === 'completed') {
        subscriptionOrdersCount++;
        subscriptionRevenue += order.totalAmount;
        if (order.paymentMethod === 'cash') subscriptionCashRevenue += order.totalAmount;
        else subscriptionBitRevenue += order.totalAmount;

        if (order.customerName.toLowerCase().includes("доставка")) subscriptionDeliveryRevenue += order.totalAmount;
        else subscriptionPickupRevenue += order.totalAmount;
      }

      const hour = new Date(order.createdAt).getHours();
      ordersByHourMap[hour] = (ordersByHourMap[hour] || 0) + 1;

      for (const item of order.items) {
        const itemRevenue = (item.priceAtTime || (item.menuItemId ? menuMap.get(item.menuItemId)?.price : 0) || 0) * item.quantity;

        const menuItem = item.menuItemId ? menuMap.get(item.menuItemId) : menuItems.find(m => m.name === (item.menuItemName || ""));
        const itemName = menuItem ? menuItem.name : (item.menuItemName || "Неизвестно");
        const lowerName = itemName.toLowerCase();

        if (lowerName.includes("доставка")) {
           // We already accounted for deliveryRevenue by order type above, but if they use an old item, we can add it here too or skip.
           // To be safe we just skip it so it doesn't pollute top dishes.
           continue; 
        }
        if (lowerName.includes("хлеб")) {
           continue;
        }

        dishSalesCount[itemName] = (dishSalesCount[itemName] || 0) + item.quantity;
        
        let itemFoodCost = 0;

        if (menuItem) {
          if (menuItem.recipeId) {
            const recipe = recipeMap.get(menuItem.recipeId);
            if (recipe) {
              const portionCost = recipe.ingredients.reduce((acc, ing) => {
                if (ing.inventoryItemId) {
                  const iItem = inventoryMap.get(ing.inventoryItemId);
                  if (iItem) {
                    const cost = ing.quantity * iItem.price;
                    ingredientCosts[iItem.name] = (ingredientCosts[iItem.name] || 0) + (cost * item.quantity / recipe.portions);
                    return acc + cost;
                  }
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

        dishTotalProfit[itemName] = (dishTotalProfit[itemName] || 0) + (itemRevenue - totalItemCost);
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

  // Staff costs
  const totalStaffCosts = shifts.reduce((sum, s) => sum + (s.total_pay || 0), 0);

  // Waste costs
  const totalWasteCosts = wasteRecords.reduce((sum, w) => {
    const item = inventoryMap.get(w.inventory_item_id);
    return sum + (w.quantity * (item?.price || 0));
  }, 0);

  const grossProfit = totalRevenue - totalCostOfGoods;

  return {
    totalRevenue,
    netProfit: grossProfit,
    realNetProfit: grossProfit - totalStaffCosts - totalWasteCosts,
    totalStaffCosts,
    totalWasteCosts,
    cashRevenue,
    bitRevenue,
    deliveryRevenue,
    completedOrdersCount,
    cancelledOrdersCount,
    totalInventoryCapital,
    inventoryCapitalByCategory,
    subscriptionRevenue,
    subscriptionOrdersCount,
    subscriptionDeliveryRevenue,
    subscriptionPickupRevenue,
    subscriptionCashRevenue,
    subscriptionBitRevenue,
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
