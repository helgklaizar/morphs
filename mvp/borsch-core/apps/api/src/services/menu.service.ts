import { prisma } from '../db';
import { sseEmitter } from '../events';

export const createCategory = async (data: any) => {
  const category = await prisma.menuCategory.create({ data });
  sseEmitter.emit('menu-updated', { type: 'category-created', category });
  return category;
};

export const updateCategory = async (id: string, data: any) => {
  const category = await prisma.menuCategory.update({ where: { id }, data });
  sseEmitter.emit('menu-updated', { type: 'category-updated', category });
  return category;
};

export const deleteCategory = async (id: string) => {
  await prisma.menuCategory.delete({ where: { id } });
  sseEmitter.emit('menu-updated', { type: 'category-deleted', id });
  return { success: true };
};

export const createMenuItem = async (data: any) => {
  const item = await prisma.menuItem.create({ 
    data,
    include: { category: true }
  });
  sseEmitter.emit('menu-updated', { type: 'item-created', item });
  return item;
};

export const updateMenuItem = async (id: string, data: any) => {
  const item = await prisma.menuItem.update({ 
    where: { id }, 
    data,
    include: { category: true }
  });
  sseEmitter.emit('menu-updated', { type: 'item-updated', item });
  return item;
};

export const deleteMenuItem = async (id: string) => {
  await prisma.menuItem.delete({ where: { id } });
  sseEmitter.emit('menu-updated', { type: 'item-deleted', id });
  return { success: true };
};

export const updateStock = async (id: string, stock: number) => {
  const item = await prisma.menuItem.update({ 
    where: { id }, 
    data: { stock } 
  });
  sseEmitter.emit('menu-updated', { type: 'stock-updated', id, stock });
  return item;
};
