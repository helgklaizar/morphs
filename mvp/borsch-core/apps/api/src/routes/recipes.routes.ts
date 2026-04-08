import { Hono } from 'hono';
import { prisma } from '../db';

const router = new Hono();

router.get('/', async (c) => {
  const recipes = await prisma.recipe.findMany({
      include: { ingredients: true }
  });
  return c.json(recipes);
});

export default router;
