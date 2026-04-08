import { useQuery } from '@tanstack/react-query';
import { fetchRecipes } from './recipes.api';
import { Recipe } from '@rms/types';

export const recipeKeys = {
  all: ['recipes'] as const,
};

export function useRecipesQuery() {
  return useQuery<Recipe[], Error>({
    queryKey: recipeKeys.all,
    queryFn: fetchRecipes,
  });
}
