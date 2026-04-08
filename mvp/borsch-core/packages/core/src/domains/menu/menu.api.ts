import { MenuItem, MenuCategory } from '@rms/types';

const API_URL = 'http://localhost:3002/api';

export const fetchCategories = async (): Promise<MenuCategory[]> => {
  const res = await fetch(`${API_URL}/menu/categories`); // Пока нет, но добавим если надо
  if (!res.ok) return [];
  return res.json();
};

export const fetchMenuItems = async (): Promise<MenuItem[]> => {
  const res = await fetch(`${API_URL}/menu`);
  if (!res.ok) throw new Error('Failed to fetch menu');
  const records = await res.json();
  
  return records.map((row: any) => ({
    id: row.id,
    name: row.name,
    price: row.price,
    cost: row.cost,
    description: row.description,
    stock: row.stock,
    isActive: row.isActive,
    image: row.imageUrl || '',
    isPoll: row.isPoll,
    recipeId: row.recipeId,
    categoryId: row.categoryId,
    categoryName: row.category?.name || '',
    kitchenDepartment: row.kitchenDepartment || '',
    isPrep: row.isPrep || false,
    unit: row.unit || 'шт',
    writeOffOnProduce: row.writeOffOnProduce || false,
  })) as MenuItem[];
};

export const updateMenuStock = async (id: string, amount: number) => {
  // Заглушка отправки PATCH
  return fetch(`${API_URL}/menu/${id}/stock`, {
     method: 'PATCH',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ stock: amount })
  }).then(r => r.json());
};

export const toggleMenuTargetActive = async (id: string, isActive: boolean) => {
  return fetch(`${API_URL}/menu/${id}/active`, {
     method: 'PATCH',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ isActive })
  }).then(r => r.json());
};

export const saveMenuItem = async (item: Partial<MenuItem>) => {
  // TODO: Поддержка загрузки файлов/multipart для imageFile
  const method = item.id ? 'PUT' : 'POST';
  const url = item.id ? `${API_URL}/menu/${item.id}` : `${API_URL}/menu`;
  
  return fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item)
  }).then(r => r.json());
};

export const deleteMenuItem = async (id: string) => {
  return fetch(`${API_URL}/menu/${id}`, { method: 'DELETE' }).then(r => r.json());
};
