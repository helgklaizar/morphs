import { prisma } from '../db';
import { Client } from '@rms/types';

export const fetchAllClients = async () => {
  return await prisma.client.findMany({
    orderBy: { updatedAt: 'desc' }
  });
};

export const upsertClient = async (data: Partial<Client>) => {
  if (!data.phone) throw new Error('Phone is required');

  return await prisma.client.upsert({
    where: { phone: data.phone },
    update: {
      name: data.name,
      address: data.address,
      updatedAt: new Date(),
    },
    create: {
      phone: data.phone,
      name: data.name,
      address: data.address,
    }
  });
};

export const updateClientStats = async (id: string, orderAmount: number) => {
  return await prisma.client.update({
    where: { id },
    data: {
      totalOrders: { increment: 1 },
      ltv: { increment: orderAmount },
      lastOrderDate: new Date(),
    }
  });
};
