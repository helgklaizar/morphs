import { prisma } from '../db';

// Списание остатков
export const writeOffStock = async (orderId: string) => {
  const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { 
          items: {
              include: { 
                  menuItem: {
                      include: { recipe: { include: { ingredients: true } } }
                  } 
              }
          } 
      }
  });

  if (!order) return;

  for (const item of order.items) {
      const { menuItem, quantity } = item;
      
      if (!menuItem) continue;

      if (menuItem.writeOffOnProduce && menuItem.recipe) {
          // Списываем ингредиенты со склада (InventoryItem) по тех. карте
          const yieldRatio = menuItem.recipe.yield || 1;
          for (const ingredient of menuItem.recipe.ingredients) {
              const deductionAmount = (ingredient.quantity / yieldRatio) * quantity;
              await prisma.inventoryItem.update({
                  where: { id: ingredient.inventoryItemId },
                  data: { stock: { decrement: deductionAmount } }
              });
          }
      } else {
          // Списываем готовый товар напрямую (Piece/Штучный)
          await prisma.menuItem.update({
              where: { id: menuItem.id },
              data: { stock: { decrement: quantity } }
          });
      }
  }
};

// Расчет дефицита и авто-создание закупок
export const calculateDeficitAndDraftPurchases = async () => {
    // Получаем текущие остатки склада
    const inventory = await prisma.inventoryItem.findMany();
    
    // Получаем активные заказы (не завершенные)
    const activeOrders = await prisma.order.findMany({
        where: { status: { notIn: ['completed', 'cancelled'] } },
        include: { items: { include: { menuItem: { include: { recipe: { include: { ingredients: true } } } } } } }
    });

    // Считаем сколько еще нужно сырья для активных заказов
    const reservedStock: Record<string, number> = {};
    activeOrders.forEach(order => {
        order.items.forEach(item => {
            const { menuItem, quantity } = item;
            if (menuItem?.writeOffOnProduce && menuItem.recipe) {
                 const yieldRatio = menuItem.recipe.yield || 1;
                 menuItem.recipe.ingredients.forEach(ing => {
                      if (reservedStock[ing.inventoryItemId] === undefined) {
                          reservedStock[ing.inventoryItemId] = 0;
                      }
                      reservedStock[ing.inventoryItemId]! += (ing.quantity / yieldRatio) * quantity;
                 });
            }
        });
    });

    const deficitItems: Array<{ id: string, name: string, deficit: number }> = [];

    inventory.forEach(inv => {
        const reserved = reservedStock[inv.id] || 0;
        // Эффективный остаток: реальный склад - резерв под открытые заказы
        const effectiveStock = inv.stock - reserved;
        if (effectiveStock < inv.minStock) {
            deficitItems.push({
               id: inv.id,
               name: inv.name,
               deficit: inv.minStock - effectiveStock
            });
        }
    });

    if (deficitItems.length > 0) {
        // Ищем дефолтного Supplier (пока берем первого, в реальности логика сложнее)
        const firstSupplier = await prisma.supplier.findFirst();
        if (firstSupplier) {
             await prisma.supplierOrder.create({
                 data: {
                     supplierId: firstSupplier.id,
                     status: "draft", // генерация черновика
                     // Записываем дефицит в items
                     items: JSON.stringify(deficitItems.map(d => ({ inventoryItemId: d.id, name: d.name, quantityToBuy: d.deficit }))),
                     totalAmount: 0 
                 }
             });
             console.log(`[Purchasing] Generated draft for deficit: ${deficitItems.length} items`);
        }
    }
};

// CRUD Operations
export const createInventoryItem = async (data: any) => {
    return await prisma.inventoryItem.create({ data });
};

export const updateInventoryItem = async (id: string, data: any) => {
    return await prisma.inventoryItem.update({ where: { id }, data });
};

export const deleteInventoryItem = async (id: string) => {
    await prisma.inventoryItem.delete({ where: { id } });
    return { success: true };
};

export const createInventoryCategory = async (data: any) => {
    return await prisma.inventoryCategory.create({ data });
};

export const updateInventoryCategory = async (id: string, data: any) => {
    return await prisma.inventoryCategory.update({ where: { id }, data });
};

export const deleteInventoryCategory = async (id: string) => {
    await prisma.inventoryCategory.delete({ where: { id } });
    return { success: true };
};

