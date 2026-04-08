import { Recipe } from '@rms/types';
import { API_URL } from '../../config';

export const fetchRecipes = async (): Promise<Recipe[]> => {
  const res = await fetch(`${API_URL}/recipes`);
  if (!res.ok) throw new Error('Failed to fetch recipes');
  return res.json();
};

export const createRecipe = async (payload: any): Promise<Recipe> => {
  const res = await fetch(`${API_URL}/recipes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to create recipe');
  return res.json();
};

export const updateRecipe = async (id: string, payload: any): Promise<Recipe> => {
  const res = await fetch(`${API_URL}/recipes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to update recipe');
  return res.json();
};

export const deleteRecipe = async (id: string): Promise<void> => {
  const res = await fetch(`${API_URL}/recipes/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete recipe');
};

