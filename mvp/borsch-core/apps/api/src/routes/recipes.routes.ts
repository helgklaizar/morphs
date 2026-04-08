import { Hono } from 'hono';
import * as recipesService from '../services/recipes.service';

const router = new Hono();

router.get('/', async (c) => {
  const recipes = await recipesService.fetchAllRecipes();
  return c.json(recipes);
});

router.post('/', async (c) => {
  const body = await c.req.json();
  const recipe = await recipesService.createRecipe(body);
  return c.json(recipe);
});

router.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const recipe = await recipesService.updateRecipe(id, body);
  return c.json(recipe);
});

router.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const result = await recipesService.deleteRecipe(id);
  return c.json(result);
});

export default router;

