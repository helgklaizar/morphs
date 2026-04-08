import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const PB_URL = 'https://borsch.shop';

async function migrate() {
    console.log('🔄 Начинаем миграцию из PocketBase (VPS) в PostgreSQL (Prisma)...');

    // 1. Категории
    const catRes = await fetch(`${PB_URL}/api/collections/menu_categories/records?perPage=500`);
    const catData = await catRes.json();
    const categories = catData.items || [];
    
    for (const cat of categories) {
        await prisma.menuCategory.upsert({
            where: { id: cat.id },
            update: {},
            create: {
                id: cat.id,
                name: cat.name,
                nameEn: cat.name_en,
                nameHe: cat.name_he,
                nameUk: cat.name_uk,
                orderIndex: cat.order_index,
            }
        });
    }
    console.log(`✅ Скопировано категорий: ${categories.length}`);

    // 2. Меню
    const menuRes = await fetch(`${PB_URL}/api/collections/menu_items/records?perPage=500`);
    const menuData = await menuRes.json();
    const menuItems = menuData.items || [];

    for (const item of menuItems) {
        await prisma.menuItem.upsert({
            where: { id: item.id },
            update: {},
            create: {
                id: item.id,
                name: item.name,
                description: item.description,
                price: item.price,
                cost: item.cost || 0,
                stock: item.stock || 0,
                isActive: Boolean(item.is_active),
                imageUrl: item.image_url || null,
                isPoll: Boolean(item.is_poll),
                categoryId: item.category_id || null,
                kitchenDepartment: item.kitchen_department || null,
                isPrep: item.is_prep || false,
                unit: item.unit || "шт",
                writeOffOnProduce: item.write_off_on_produce || false,
            }
        });
    }
    console.log(`✅ Скопировано позиций меню: ${menuItems.length}`);

    // 3. Инвентарь
    const invRes = await fetch(`${PB_URL}/api/collections/inventory_items/records?perPage=500`);
    const invData = await invRes.json();
    const inventoryItems = invData.items || [];

    for (const item of inventoryItems) {
        await prisma.inventoryItem.upsert({
            where: { id: item.id },
            update: {},
            create: {
                id: item.id,
                name: item.name,
                unit: item.unit || 'шт',
                stock: item.stock || item.quantity || 0,
                costPerUnit: item.cost || item.price || 0,
            }
        });
    }
    console.log(`✅ Скопировано позиций склада: ${inventoryItems.length}`);

    // 4. Заказы (последние 100 для истории)
    const ordersRes = await fetch(`${PB_URL}/api/collections/orders/records?perPage=100&sort=-created`);
    if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        const ordersList = ordersData.items || [];

        for (const order of ordersList) {
            await prisma.order.upsert({
                where: { id: order.id },
                update: {},
                create: {
                    id: order.id,
                    customerName: order.customer_name || 'Гость',
                    customerPhone: order.customer_phone || '',
                    status: order.status || 'completed',
                    totalAmount: order.total_amount || 0,
                    paymentMethod: order.payment_method || 'cash',
                    isArchived: Boolean(order.is_archived)
                }
            });
        }
        console.log(`✅ Скопировано последних заказов: ${ordersList.length}`);
    } else {
        console.log(`⚠️ Коллекция orders не найдена или пуста.`);
    }

    console.log('🎉 Базовая миграция завершена!');
}

migrate()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
