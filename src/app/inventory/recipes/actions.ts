"use server"

import { PrismaClient } from "@prisma/client"
import { revalidatePath } from "next/cache"

const prisma = new PrismaClient()

// Fetch all products with their current recipes
export async function getProductsWithRecipes() {
    return await prisma.product.findMany({
        where: { active: true },
        include: {
            recipe: {
                include: {
                    ingredients: {
                        include: {
                            inventoryItem: true
                        }
                    }
                }
            }
        },
        orderBy: { name: 'asc' }
    })
}

// Fetch all available inventory items to use as ingredients
export async function getInventoryItems() {
    return await prisma.inventoryItem.findMany({
        where: { active: true },
        orderBy: { name: 'asc' }
    })
}

// Save or Update a Recipe
export async function saveRecipe(productId: string, ingredients: { inventoryItemId: string, quantity: number }[]) {
    try {
        await prisma.$transaction(async (tx) => {
            // 1. Find or Create Recipe Record
            let recipe = await tx.recipe.findUnique({
                where: { productId }
            })

            if (!recipe) {
                recipe = await tx.recipe.create({
                    data: { productId }
                })
            }

            // 2. Clear old ingredients (simpler than syncing diffs for now)
            await tx.recipeIngredient.deleteMany({
                where: { recipeId: recipe.id }
            })

            // 3. Add new ingredients
            if (ingredients.length > 0) {
                await tx.recipeIngredient.createMany({
                    data: ingredients.map(i => ({
                        recipeId: recipe!.id,
                        inventoryItemId: i.inventoryItemId,
                        quantity: i.quantity
                    }))
                })
            }
        })

        revalidatePath('/inventory/recipes')
        return { success: true }
    } catch (error) {
        console.error("Error saving recipe:", error)
        return { success: false, error: "Error al guardar la receta." }
    }
}
