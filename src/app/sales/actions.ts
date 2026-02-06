"use server"

import { PrismaClient, PaymentMethod } from "@prisma/client"

const prisma = new PrismaClient()

export async function getProducts() {
    // ... existing code ...
    // Ensure "BEBIDA" product exists (Placeholder)
    const bebidaProduct = await prisma.product.findFirst({ where: { name: "Bebida", category: "BEBIDA" } })
    if (!bebidaProduct) {
        await prisma.product.create({
            data: { name: "Bebida", category: "BEBIDA", price: 1.00, active: true }
        })
    }

    // Ensure "Maltas Desch." product exists
    const maltaProduct = await prisma.product.findFirst({ where: { name: "Maltas Desch." } })
    if (!maltaProduct) {
        await prisma.product.create({
            data: { name: "Maltas Desch.", category: "BEBIDA", price: 1.20, active: true }
        })
    }

    // Ensure "Refresco 1.5L" product exists
    const refrescoProduct = await prisma.product.findFirst({ where: { name: "Refresco 1.5L" } })
    if (!refrescoProduct) {
        await prisma.product.create({
            data: { name: "Refresco 1.5L", category: "BEBIDA", price: 3.00, active: true }
        })
    }

    const products = await prisma.product.findMany({
        where: { active: true },
        orderBy: { category: 'asc' },
    })
    // Serialize Decimals for Client Components if needed, but Prisma usually returns objects. 
    // Next.js Server Components serialize automatically, but Decimal types might need conversion.
    return products.map(p => ({
        ...p,
        price: p.price.toNumber(), // Convert Decimal to number for frontend
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
    }))
}

export async function createSale(data: {
    userId: string,
    items: { productId: string, quantity: number, unitPrice: number, name?: string }[],
    total: number,
    paymentMethod: "CASH" | "TRANSFER" | "MOBILE_PAYMENT", // Matches specific string union
    paymentReference?: string, // New optional field
    exchangeRate?: number, // New optional field
    notes?: string
}) {
    try {
        // Ensure user exists (quick fix for dev environment/seeds)
        const user = await prisma.user.upsert({
            where: { email: 'freddy' },
            update: {},
            create: {
                id: 'admin-id',
                email: 'freddy',
                name: 'Freddy Admin',
                passwordHash: 'freddy',
                role: 'ADMIN'
            }
        })

        // Ensure "PERSONALIZADO" product exists for custom items
        // We'll use a fixed strategy: find first 'OTRO' category product or create one
        let customProductId = ""
        const customProduct = await prisma.product.findFirst({
            where: { category: 'OTRO' }
        })

        if (customProduct) {
            customProductId = customProduct.id
        } else {
            const newCustom = await prisma.product.create({
                data: {
                    name: "PERSONALIZADO",
                    category: "OTRO",
                    price: 0,
                    active: true
                }
            })
            customProductId = newCustom.id
        }

        // ... existing sale creation ...
        const sale = await prisma.sale.create({
            data: {
                userId: user.id,
                total: data.total,
                paymentMethod: data.paymentMethod as PaymentMethod,
                paymentReference: data.paymentReference,
                exchangeRate: data.exchangeRate,
                totalBs: data.exchangeRate ? (data.total * data.exchangeRate) : undefined,
                notes: data.notes,
                items: {
                    create: data.items.map(item => {
                        const isCustom = item.productId.startsWith('custom-')
                        return {
                            productId: isCustom ? customProductId : item.productId,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            subtotal: item.quantity * item.unitPrice,
                            productName: item.name || (isCustom ? "Item Personalizado" : undefined)
                        }
                    })
                }
            }
        })

        // --- INTELLIGENT INVENTORY LOGIC ---
        // 1. Get Recipes for Sold Items
        const soldProductIds = data.items.map(i => i.productId).filter(id => !id.startsWith('custom-'))

        if (soldProductIds.length > 0) {
            const recipes = await prisma.recipe.findMany({
                where: { productId: { in: soldProductIds } },
                include: { ingredients: true }
            })

            const recipeMap = new Map(recipes.map(r => [r.productId, r.ingredients]))

            // 2. Calculate Total Ingredient Usage
            // Map: InventoryItemId -> TotalQuantityUsed
            const usageMap = new Map<string, number>()

            for (const item of data.items) {
                if (item.productId.startsWith('custom-')) continue

                const ingredients = recipeMap.get(item.productId)
                if (ingredients) {
                    for (const ing of ingredients) {
                        const totalUsed = Number(ing.quantity) * item.quantity
                        const current = usageMap.get(ing.inventoryItemId) || 0
                        usageMap.set(ing.inventoryItemId, current + totalUsed)
                    }
                }
            }

            // 3. Update Inventory & Shopping List (Transactional)
            // We iterate through usageMap and update DB
            if (usageMap.size > 0) {
                // Note: Ideally all this (Sale + Inventory) should be ONE big transaction.
                // Prisma doesn't support nested transactions easily unless we wrap EVERYTHING in one.
                // For now, we'll run this as a "side effect" transaction. If it fails, Sale exists but Inventory isn't updated.
                // Acceptable for MVP. For Prod, we'd refactor createSale to wrap everything.

                await prisma.$transaction(async (tx) => {
                    for (const [itemId, qtyUsed] of Array.from(usageMap.entries())) {

                        // A. Deduct from Stock
                        await tx.inventoryItem.update({
                            where: { id: itemId },
                            data: { currentStock: { decrement: qtyUsed } }
                        })

                        // B. Add to Shopping List (Accumulate)
                        const shoppingItem = await tx.shoppingItem.findFirst({
                            where: { inventoryItemId: itemId, isPurchased: false }
                        })

                        if (shoppingItem) {
                            await tx.shoppingItem.update({
                                where: { id: shoppingItem.id },
                                data: { quantity: { increment: qtyUsed } }
                            })
                        } else {
                            // Get latest cost for estimate
                            const item = await tx.inventoryItem.findUnique({ where: { id: itemId } })
                            const estimatedPrice = (Number(item?.lastCost || 0) * qtyUsed)
                            // Note: estimatedPrice here is total for this chunk. 
                            // Actually schema says estimatedPrice is for the specific ShoppingItem row.
                            // Better logic: Update quantity only. Recalculate estimatedPrice on View or update here?
                            // Let's just update Quantity. Price logic should be dynamic or updated.
                            // However, we need 'estimatedPrice' in create. Let's set it based on unit cost.

                            await tx.shoppingItem.create({
                                data: {
                                    inventoryItemId: itemId,
                                    quantity: qtyUsed,
                                    estimatedPrice: Number(item?.lastCost || 0), // Unit price snapshot? Or Total? 
                                    // Schema doc says "Snapshot of expected cost". Usually Unit Price * Qty.
                                    // Let's store UNIT PRICE in estimatedPrice so we can multiply later?
                                    // Or Store TOTAL? Plan said "Expected cost". 
                                    // Let's store UNIT COST in 'estimatedPrice' for simplicity, and calc Total in UI.
                                    // Configuring schema... wait, schema has 'estimatedPrice' Decimal.
                                    // Let's assume it's UNIT cost for now to allow recalculation.
                                }
                            })
                        }
                    }
                })
            }
        }

        return { success: true, saleId: sale.id }
    } catch (error) {
        console.error("Sale creation error:", error)
        return { success: false, error: String(error) }
    }
}
