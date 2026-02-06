"use server"

import { PrismaClient } from "@prisma/client"
import { revalidatePath } from "next/cache"

const prisma = new PrismaClient()

// Get current shopping list items
export async function getShoppingList() {
    const items = await prisma.shoppingItem.findMany({
        where: { isPurchased: false },
        include: {
            inventoryItem: {
                select: { name: true, unit: true, lastCost: true }
            }
        },
        orderBy: { inventoryItem: { name: 'asc' } }
    })

    return items.map(item => ({
        ...item,
        quantity: Number(item.quantity),
        estimatedPrice: Number(item.estimatedPrice),
        currentStock: 0 // We could fetch this if needed for context
    }))
}

// Confirm purchase of selected items
export async function confirmShoppingListPurchase(data: {
    items: { id: string, quantity: number, price: number }[], // ShoppingItem ID, but we need InventoryItemId
    // Wait, we need to map ShoppingItem -> InventoryPurchase.
    // The UI should send the approved list.
    supplier?: string,
    receiptUrl?: string,
    userId: string
}) {
    // 1. We need to know which InventoryItem corresponds to the ShoppingItem.
    // The Input 'items' should probably contain enough info or we re-fetch.
    // Better: The UI sends { shoppingItemId, quantity, price }

    try {
        await prisma.$transaction(async (tx) => {
            // Ensure user exists (admin fallback)
            const user = await tx.user.upsert({
                where: { email: 'freddy' },
                create: { id: 'admin-id', email: 'freddy', name: 'Freddy Admin', role: 'ADMIN', passwordHash: 'freddy' },
                update: {}
            })

            const shoppingItemIds = data.items.map(i => i.id)
            const dbShoppingItems = await tx.shoppingItem.findMany({
                where: { id: { in: shoppingItemIds } }
            })

            const itemMap = new Map(dbShoppingItems.map(i => [i.id, i.inventoryItemId]))

            for (const inputItem of data.items) {
                const inventoryItemId = itemMap.get(inputItem.id)
                if (!inventoryItemId) continue;

                // A. Create Purchase Record
                await tx.inventoryPurchase.create({
                    data: {
                        itemId: inventoryItemId,
                        quantity: inputItem.quantity,
                        price: inputItem.price, // Total price for this line
                        supplier: data.supplier,
                        receiptUrl: data.receiptUrl,
                        userId: user.id
                    }
                })

                // B. Update Stock
                await tx.inventoryItem.update({
                    where: { id: inventoryItemId },
                    data: {
                        currentStock: { increment: inputItem.quantity },
                        lastCost: (inputItem.price / inputItem.quantity) // Update last unit cost cache
                    }
                })

                // C. Mark ShoppingItem as Purchased (or delete)
                // We delete to clear the list, or mark purchased if we want history. 
                // Schema has isPurchased. Let's delete to keep table clean for "Active List". 
                // Or set quantity to 0? The logic is "Accumulation".
                // If we delete, next sale will create new row. Correct.
                await tx.shoppingItem.delete({
                    where: { id: inputItem.id }
                })
            }
        })

        revalidatePath('/inventory/shopping-list')
        revalidatePath('/inventory')
        return { success: true }
    } catch (error) {
        console.error("Error confirming purchase:", error)
        return { success: false, error: "Error al procesar la compra." }
    }
}

// Remove item from list (without buying)
export async function removeFromList(id: string) {
    try {
        await prisma.shoppingItem.delete({ where: { id } })
        revalidatePath('/inventory/shopping-list')
        return { success: true }
    } catch (error) {
        return { success: false, error: "Error al eliminar." }
    }
}
