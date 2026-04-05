import { pb } from '../pocketbase';

export interface AssemblyItemRecord {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  inventoryItemId: string;
}

export interface AssemblyRecord {
  id: string;
  name: string;
  totalCost: number;
  items: AssemblyItemRecord[];
}

export class AssembliesRepository {
  static async fetchAll(): Promise<AssemblyRecord[]> {
    const records = await pb.collection('assemblies').getFullList({
      sort: '-created',
      expand: 'assembly_items(assembly_id).inventory_item_id'
    });

    return (records || []).map((row: any) => {
      let total = 0;
      const items = (row.expand?.['assembly_items(assembly_id)'] || []).map((item: any) => {
        const inv = item.expand?.inventory_item_id;
        if (inv && inv.price) {
          total += item.quantity * inv.price;
        }
        return {
          id: item.id,
          name: inv?.name || '?',
          quantity: item.quantity,
          unit: inv?.unit || 'шт',
          inventoryItemId: item.inventory_item_id
        };
      });

      return {
        id: row.id,
        name: row.name || '',
        totalCost: total,
        items
      };
    });
  }

  static async add(name: string, items: {inventoryItemId: string, quantity: number}[]): Promise<void> {
    const assembly = await pb.collection('assemblies').create({ name });
    const validItems = items.filter(i => i.inventoryItemId !== "");
    
    for (const it of validItems) {
      await pb.collection('assembly_items').create({
        assembly_id: assembly.id,
        inventory_item_id: it.inventoryItemId,
        quantity: it.quantity
      });
    }
  }

  static async update(id: string, name: string, items: {inventoryItemId: string, quantity: number}[]): Promise<void> {
    await pb.collection('assemblies').update(id, { name });
    
    const oldItems = await pb.collection('assembly_items').getFullList({
      filter: pb.filter('assembly_id = {:id}', { id })
    });
    for (const item of oldItems) {
      await pb.collection('assembly_items').delete(item.id);
    }
    
    const validItems = items.filter(i => i.inventoryItemId !== "");
    for (const it of validItems) {
      await pb.collection('assembly_items').create({
        assembly_id: id,
        inventory_item_id: it.inventoryItemId,
        quantity: it.quantity
      });
    }
  }

  static async delete(id: string): Promise<void> {
    await pb.collection('assemblies').delete(id);
  }
}
