import { prisma } from '../db';
import { startOfDay, subDays, format } from 'date-fns';

export const getAnalyticsSummary = async () => {
  const now = new Date();
  const todayStart = startOfDay(now);
  const sevenDaysAgo = subDays(todayStart, 7);

  // 1. Total Revenue (all time completed orders)
  const totalRevenue = await prisma.order.aggregate({
    where: { status: 'completed' },
    _sum: { totalAmount: true }
  });

  // 2. Orders count (all time)
  const totalOrders = await prisma.order.count();

  // 3. New clients (last 30 days)
  const newClients = await prisma.client.count({
    where: { createdAt: { gte: subDays(now, 30) } }
  });

  // 4. Sales by day (last 7 days)
  const salesByDay = [];
  for (let i = 6; i >= 0; i--) {
    const d = subDays(todayStart, i);
    const nextD = subDays(todayStart, i - 1);
    
    const dayRevenue = await prisma.order.aggregate({
      where: {
        status: 'completed',
        createdAt: { gte: d, lt: nextD }
      },
      _sum: { totalAmount: true }
    });

    salesByDay.push({
      date: format(d, 'dd.MM'),
      amount: dayRevenue._sum.totalAmount || 0
    });
  }

  // 5. Popular items
  const popularItems = await prisma.orderItem.groupBy({
    by: ['menuItemName'],
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: 5
  });

  return {
    stats: {
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      totalOrders,
      newClients,
      avgCheck: totalOrders > 0 ? (totalRevenue._sum.totalAmount || 0) / totalOrders : 0
    },
    salesByDay,
    popularItems: popularItems.map(item => ({
      name: item.menuItemName,
      quantity: item._sum.quantity || 0
    }))
  };
};
