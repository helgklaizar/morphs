import { prisma } from '../db';

export const fetchAllSuppliers = async () => {
  return await prisma.supplier.findMany({
    include: { orders: true }
  });
};

export const createSupplier = async (data: any) => {
  return await prisma.supplier.create({ data });
};

export const fetchAllSupplierOrders = async () => {
  return await prisma.supplierOrder.findMany({
    include: { supplier: true },
    orderBy: { createdAt: 'desc' }
  });
};

export const createSupplierOrder = async (data: any) => {
  return await prisma.supplierOrder.create({ data });
};

export const deleteSupplier = async (id: string) => {
  return await prisma.supplier.delete({ where: { id } });
};

export const deleteSupplierOrder = async (id: string) => {
  return await prisma.supplierOrder.delete({ where: { id } });
};
