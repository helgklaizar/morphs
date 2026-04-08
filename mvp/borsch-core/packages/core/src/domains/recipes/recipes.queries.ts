import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from './recipes.api';
import { Recipe } from '@rms/types';

export const recipeKeys = {
  all: ['recipes'] as const,
};

export function useRecipesQuery() {
  return useQuery<Recipe[], Error>({
    queryKey: recipeKeys.all,
    queryFn: api.fetchRecipes,
  });
}

export function useCreateRecipeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createRecipe,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.all });
    },
  });
}

export function useUpdateRecipeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => 
      api.updateRecipe(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.all });
    },
  });
}

export function useDeleteRecipeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deleteRecipe,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.all });
    },
  });
}

