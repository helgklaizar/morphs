import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useRecipesStore } from '../useRecipesStore';
import { RecipesRepository } from '@/lib/repositories/recipes';

vi.mock('@/lib/repositories/recipes', () => ({
  RecipesRepository: {
    fetchAll: vi.fn(),
    saveRecipe: vi.fn(),
    delete: vi.fn(),
    calculateCost: vi.fn().mockReturnValue(150)
  }
}));

describe('useRecipesStore', () => {
  beforeEach(() => {
    useRecipesStore.setState({ recipes: [], isLoading: true, error: null });
    vi.clearAllMocks();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('fetchRecipes', async () => {
    const recipes = [{ id: 'r1', name: 'RMS' }];
    vi.mocked(RecipesRepository.fetchAll).mockResolvedValue(recipes as any);

    await useRecipesStore.getState().fetchRecipes();
    expect(useRecipesStore.getState().recipes).toEqual(recipes);
  });

  it('saveRecipe refetches', async () => {
    const rfMock = vi.fn();
    useRecipesStore.setState({ fetchRecipes: rfMock });

    await useRecipesStore.getState().saveRecipe(null, 'Soup', 1, []);
    expect(RecipesRepository.saveRecipe).toHaveBeenCalled();
    expect(rfMock).toHaveBeenCalled();
  });

  it('deleteRecipe removes optimistically', async () => {
    useRecipesStore.setState({ recipes: [{ id: 'r2' } as any] });
    
    await useRecipesStore.getState().deleteRecipe('r2');
    expect(useRecipesStore.getState().recipes.length).toBe(0);
    expect(RecipesRepository.delete).toHaveBeenCalledWith('r2');
  });

  it('calculateRecipeCost delegates to repo', () => {
    useRecipesStore.setState({ recipes: [{ id: 'r3' } as any] });
    
    const cost = useRecipesStore.getState().calculateRecipeCost('r3');
    expect(cost).toBe(150);
    expect(RecipesRepository.calculateCost).toHaveBeenCalled();
  });
});
