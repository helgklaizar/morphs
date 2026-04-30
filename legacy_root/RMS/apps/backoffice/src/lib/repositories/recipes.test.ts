import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecipesRepository } from './recipes';
import { pb } from '../pocketbase';

vi.mock('../pocketbase', () => ({
  pb: { 
    collection: vi.fn(),
    filter: vi.fn((query) => query),
    autoCancellation: vi.fn()
  },
}));

describe('RecipesRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchAll() maps expand to proper shape', async () => {
    const raw = [{
      id: 'r1',
      name: 'Salad',
      portions: 1,
      expand: {
        'recipe_ingredients(recipe_id)': [
          {
            id: 'ing1',
            recipe_id: 'r1',
            inventory_item_id: 'inv1',
            quantity: 3,
            expand: {
              inventory_item_id: { name: 'Tomato', unit: 'kg', price: 10 }
            }
          }
        ]
      }
    }];
    const getFullList = vi.fn().mockResolvedValue(raw);
    vi.mocked(pb.collection).mockReturnValue({ getFullList } as any);

    const result = await RecipesRepository.fetchAll();
    expect(result[0].name).toBe('Salad');
    expect(result[0].ingredients[0].inventoryItem?.name).toBe('Tomato');
  });

  it('saveRecipe() coordinates creation of recipe and ingredients', async () => {
    const mockCreate = vi.fn().mockResolvedValue({ id: 'new_r1' });
    vi.mocked(pb.collection).mockReturnValue({ create: mockCreate } as any);

    await RecipesRepository.saveRecipe(null, 'Cake', 2, [
      { inventoryItemId: 'inv2', quantity: 5 }
    ]);

    expect(mockCreate).toHaveBeenCalledTimes(2); // one for recipe, one for ingredient
  });

  it('saveRecipe() handles update correctly (deletes old records)', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({ id: 'r2' });
    const getFullList = vi.fn().mockResolvedValue([{ id: 'old_ing1' }]);
    const mockDelete = vi.fn();
    const mockCreate = vi.fn();

    vi.mocked(pb.collection).mockReturnValue({ 
      update: mockUpdate, 
      getFullList, 
      delete: mockDelete, 
      create: mockCreate 
    } as any);

    await RecipesRepository.saveRecipe('r2', 'Cake', 2, [
      { inventoryItemId: 'inv2', quantity: 5 }
    ]);

    expect(mockUpdate).toHaveBeenCalledWith('r2', { name: 'Cake', portions: 2 });
    expect(mockDelete).toHaveBeenCalledWith('old_ing1');
    expect(mockCreate).toHaveBeenCalled();
  });

  it('calculateCost() accurately computes recursive costs', () => {
    const basic: any = {
      id: 'sub1',
      portions: 2,
      ingredients: [{ inventoryItemId: 'inv1', quantity: 10, inventoryItem: { price: 2 } }]
    }; // total = 20. But portions = 2. So 10 per portion.

    const master: any = {
      id: 'mas1',
      ingredients: [
        { nestedRecipeId: 'sub1', quantity: 3 } // 3 * 10 = 30
      ]
    };

    const cost = RecipesRepository.calculateCost(master, [basic, master]);
    expect(cost).toBe(30);
  });

  it('delete() calls pb', async () => {
    const mockDelete = vi.fn();
    vi.mocked(pb.collection).mockReturnValue({ delete: mockDelete } as any);
    await RecipesRepository.delete('r1');
    expect(mockDelete).toHaveBeenCalledWith('r1');
  });
});
