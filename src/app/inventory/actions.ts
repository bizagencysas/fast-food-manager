"use server"

import { PrismaClient } from "@prisma/client"
import { revalidatePath } from "next/cache"

const prisma = new PrismaClient()

// Existing functions... keep them if needed, but adding new one

export async function getInventory() {
    const items = await prisma.inventoryItem.findMany({
        include: { category: true },
        orderBy: { name: 'asc' }
    })
    return items.map(i => ({
        ...i,
        currentStock: i.currentStock.toNumber(),
        minStock: i.minStock.toNumber(),
    }))
}

export async function getCategories() {
    return await prisma.inventoryCategory.findMany()
}

// Single item record (deprecated by new UI but keeping for safety if needed)
export async function recordPurchase(data: any) {
    // ... redirection ...
    return { success: false, error: "Use bulk purchase" }
}

export async function recordBulkPurchase(data: {
    items: { name: string, quantity: number, price: number }[],
    receiptUrl: string,
    supplier?: string,
    userId: string
}) {
    try {
        await prisma.$transaction(async (tx) => {
            // Find or get default category once
            const defaultCategory = await tx.inventoryCategory.findFirst({
                where: { name: 'OTROS' }
            }) || await tx.inventoryCategory.findFirst();

            if (!defaultCategory) throw new Error("No inventory categories found.");

            for (const itemData of data.items) {
                const normalizedName = itemData.name.charAt(0).toUpperCase() + itemData.name.slice(1).toLowerCase();

                // 1. Find or Create Item
                let item = await tx.inventoryItem.findFirst({
                    where: { name: normalizedName }
                })

                if (!item) {
                    item = await tx.inventoryItem.create({
                        data: {
                            name: normalizedName,
                            categoryId: defaultCategory.id,
                            unit: 'Unidad', // Default
                            currentStock: 0,
                            minStock: 5
                        }
                    })
                }

                // 2. Create Purchase Record
                await tx.inventoryPurchase.create({
                    data: {
                        itemId: item.id,
                        quantity: itemData.quantity,
                        price: itemData.price, // Cost for this specific item quantity
                        supplier: data.supplier,
                        receiptUrl: data.receiptUrl,
                        userId: data.userId
                    }
                })

                // 3. Update Stock
                await tx.inventoryItem.update({
                    where: { id: item.id },
                    data: {
                        currentStock: { increment: itemData.quantity }
                    }
                })
            }
        })

        revalidatePath('/inventory')
        return { success: true }
    } catch (error) {
        console.error("Bulk purchase error:", error)
        return { success: false, error: "Failed to record purchases" }
    }
}
