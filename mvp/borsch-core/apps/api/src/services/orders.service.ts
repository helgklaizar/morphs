import { prisma } from '../db';
import { sseEmitter } from '../events';
import { sendTelegramNotification } from '../infrastructure/telegram';
import { writeOffStock } from './inventory.service';
import { Order, OrderStatus } from '@rms/types';

export const createOrder = async (data: any) => {
  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        status: data.status || "new",
        totalAmount: data.totalAmount || 0,
        paymentMethod: data.paymentMethod || "cash",
        reservationDate: data.reservationDate || null,
        tableId: data.tableId || null,
        items: {
          create: data.items.map((i: any) => ({
            menuItemId: i.menuItemId,
            menuItemName: i.menuItemName,
            quantity: i.quantity,
            priceAtTime: i.priceAtTime
          }))
        }
      },
      include: { items: true }
    });

    // Side effects (outside transaction but tracked)
    sendTelegramNotification(order);
    sseEmitter.emit('order-created', order);

    return order;
  });
};

export const updateOrderStatus = async (id: string, status: OrderStatus) => {
  const updated = await prisma.order.update({
    where: { id },
    data: { status }
  });

  // Business Logic: Write off stock on completion
  if (status === 'completed') {
    writeOffStock(id).catch(console.error);
  }

  sseEmitter.emit('order-updated', updated);
  return updated;
};

export const updateOrder = async (id: string, data: any) => {
  return await prisma.$transaction(async (tx) => {
    const { items, ...orderData } = data;

    // 1. Update basic order info
    const updated = await tx.order.update({
      where: { id },
      data: orderData
    });

    // 2. If items are provided, sync them (Delete all and recreate)
    // This is the safest way for MVP to ensure sync
    if (items && Array.isArray(items)) {
      await tx.orderItem.deleteMany({ where: { orderId: id } });
      
      const newItems = items.map((i: any) => ({
        orderId: id,
        menuItemId: i.menuItemId,
        menuItemName: i.menuItemName,
        quantity: i.quantity,
        priceAtTime: i.priceAtTime || i.price || 0
      }));

      await tx.orderItem.createMany({ data: newItems });
    }
    
    // Fetch full order for response and event
    const fullOrder = await tx.order.findUnique({
      where: { id },
      include: { items: true }
    });

    sseEmitter.emit('order-updated', fullOrder);
    return fullOrder;
  });
};


export const deleteOrder = async (id: string) => {
  await prisma.order.delete({ where: { id } });
  // Optionally emit delete event
  return { success: true };
};
