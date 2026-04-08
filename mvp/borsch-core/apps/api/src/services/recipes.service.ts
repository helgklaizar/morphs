import { prisma } from '../db';

export const fetchAllRecipes = async () => {
  return await prisma.recipe.findMany({
    include: { ingredients: { include: { inventoryItem: true } } },
    orderBy: { createdAt: 'desc' }
  });
};

export const createRecipe = async (data: any) => {
  const { name, yield: recipeYield, ingredients } = data;
  return await prisma.recipe.create({
    data: {
      name,
      yield: recipeYield,
      ingredients: {
        create: ingredients.map((ing: any) => ({
          inventoryItemId: ing.inventoryItemId,
          quantity: ing.quantity
        }))
      }
    },
    include: { ingredients: { include: { inventoryItem: true } } }
  });
};

export const updateRecipe = async (id: string, data: any) => {
  const { name, yield: recipeYield, ingredients } = data;

  return await prisma.$transaction(async (tx) => {
    // Sync ingredients: Delete existing and recreate
    await tx.recipeIngredient.deleteMany({ where: { recipeId: id } });

    return await tx.recipe.update({
      where: { id },
      data: {
        name,
        yield: recipeYield,
        ingredients: {
          create: ingredients.map((ing: any) => ({
            inventoryItemId: ing.inventoryItemId,
            quantity: ing.quantity
          }))
        }
      },
      include: { ingredients: { include: { inventoryItem: true } } }
    });
  });
};

export const deleteRecipe = async (id: string) => {
  return await prisma.$transaction(async (tx) => {
    await tx.recipeIngredient.deleteMany({ where: { recipeId: id } });
    await tx.recipe.delete({ where: { id } });
    return { success: true };
  });
};
