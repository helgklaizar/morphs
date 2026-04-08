import { useMemo } from 'react';
import type { Order } from '@rms/core';

export const useDerivedOrders = (orders: Order[]) => {
  const subscriptionOrders = useMemo(() => {
    return orders.filter(o => o.customerName.includes("Подписка"));
  }, [orders]);

  const megaProfiles = useMemo(() => {
    const profiles: Record<string, { phone: string, cleanName: string, orders: Order[], totalSum: number, paymentMethod: string }> = {};
    subscriptionOrders.forEach(o => {
      const match = o.customerName.match(/^(.*?)\s*\(Подписка/i);
      const cleanName = match ? match[1].trim() : o.customerName;
      const key = `${o.customerPhone}-${cleanName}`;
      
      if (!profiles[key]) {
        profiles[key] = { phone: o.customerPhone, cleanName, orders: [], totalSum: 0, paymentMethod: o.paymentMethod };
      }
      profiles[key].orders.push(o);
      profiles[key].totalSum += o.totalAmount;
    });
    return Object.values(profiles);
  }, [subscriptionOrders]);

  return { targetMegaProfiles: megaProfiles, subscriptionOrders };
};
