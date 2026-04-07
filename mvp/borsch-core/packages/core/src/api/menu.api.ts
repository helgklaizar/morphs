import { pb } from '@rms/db-local';
import { MenuItem, MenuCategory } from '@rms/types';

export const fetchCategories = async (): Promise<MenuCategory[]> => {
  const records = await pb.collection('menu_categories').getFullList({ sort: 'order_index' });
  return records.map(r => ({
     id: r.id, name: r.name, nameEn: r.name_en, nameHe: r.name_he, nameUk: r.name_uk, orderIndex: r.order_index
  })) as MenuCategory[];
};

export const fetchMenuItems = async (): Promise<MenuItem[]> => {
  const records = await pb.collection('menu_items').getFullList({
    sort: '-created',
    expand: 'category_id',
  });
  return records.map((row) => ({
    id: row.id,
    name: row.name,
    price: row.price,
    cost: row.cost,
    description: row.description,
    stock: row.stock,
    isActive: row.is_active,
    image: row.image_url || (row.image ? pb.files.getUrl(row, row.image) : ''),
    isPoll: row.is_poll,
    recipeId: row.recipe_id,
    assemblyId: row.assembly_id,
    categoryId: row.category_id,
    categoryName: row.expand?.category_id?.name || '',
    kitchenDepartment: row.kitchen_department || '',
    isPrep: row.is_prep || false,
    unit: row.unit || 'шт',
    writeOffOnProduce: row.write_off_on_produce || false,
  })) as unknown as MenuItem[];
};

export const updateMenuStock = async (id: string, amount: number) => {
  return await pb.collection('menu_items').update(id, { stock: amount });
};

export const toggleMenuTargetActive = async (id: string, isActive: boolean) => {
  return await pb.collection('menu_items').update(id, { is_active: isActive });
};

export const saveMenuItem = async (item: Partial<MenuItem> & { imageFile?: File }) => {
  const formData = new FormData();
  Object.entries(item).forEach(([key, val]) => {
     if (key !== 'imageFile' && val !== undefined) {
         formData.append(key === 'isActive' ? 'is_active' : key, val as string | Blob);
     }
  });
  if (item.imageFile) formData.append('image', item.imageFile);
  
  if (item.id) {
      return await pb.collection('menu_items').update(item.id, formData);
  } else {
      return await pb.collection('menu_items').create(formData);
  }
};

export const deleteMenuItem = async (id: string) => {
  return await pb.collection('menu_items').delete(id);
};
