import { Recipe } from '@rms/types';

const API_URL = 'http://localhost:3002/api';

export const fetchRecipes = async (): Promise<Recipe[]> => {
  const res = await fetch(`${API_URL}/recipes`);
  if (!res.ok) throw new Error('Failed to fetch recipes');
  return res.json();
};

// Заглушки для CRUD рецептов
export const createRecipe = async (payload: Partial<Recipe>) => {
  return fetch(`${API_URL}/recipes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
  }).then(r => r.json());
};
