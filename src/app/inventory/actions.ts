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
    if (!data.items || data.items.length === 0) {
        return { success: false, error: "No hay items para registrar." }
    }

    // Validate inputs
    for (const item of data.items) {
        if (isNaN(item.quantity) || item.quantity <= 0) return { success: false, error: `Cantidad inválida para: ${item.name}` }
        if (isNaN(item.price) || item.price < 0) return { success: false, error: `Precio inválido para: ${item.name}` }
    }

    try {
        // Ensure user exists (Fix for FK constraint error)
        // Using same logic as Sales to ensure 'admin-id' or similar exists
        const user = await prisma.user.upsert({
            where: { email: 'freddy' },
            create: {
                id: 'admin-id', // Fixed ID for simplicity in this version
                email: 'freddy',
                name: 'Freddy Admin',
                passwordHash: 'freddy',
                role: 'ADMIN'
            },
            update: {}
        })

        const verifiedUserId = user.id

        // 1. Normalization & Deduplication (Memory)
        const normalizedItemsMap = new Map<string, {
            originalName: string,
            quantity: number,
            price: number
        }>();

        for (const item of data.items) {
            const normalized = item.name.trim().charAt(0).toUpperCase() + item.name.trim().slice(1).toLowerCase();
            const existing = normalizedItemsMap.get(normalized);
            if (existing) {
                existing.quantity += item.quantity;
                existing.price += item.price;
            } else {
                normalizedItemsMap.set(normalized, {
                    originalName: normalized,
                    quantity: item.quantity,
                    price: item.price
                });
            }
        }

        const uniqueItems = Array.from(normalizedItemsMap.values());
        const uniqueNames = Array.from(normalizedItemsMap.keys());

        await prisma.$transaction(async (tx) => {
            // Find default category ID once
            const defaultCategory = await tx.inventoryCategory.findFirst({
                where: { name: 'OTROS' }
            }) || await tx.inventoryCategory.findFirst();

            if (!defaultCategory) {
                // Create default category if missing
                const newCat = await tx.inventoryCategory.create({ data: { name: 'OTROS' } })
                if (!newCat) throw new Error("No inventory categories available.");
            }
            // Use 'OTROS' or the first one found
            const targetCategoryId = defaultCategory?.id || (await tx.inventoryCategory.findFirst())?.id;
            if (!targetCategoryId) throw new Error("Critical: No category usable.");

            // 2. Bulk Fetch Existing Items
            const existingDbItems = await tx.inventoryItem.findMany({
                where: {
                    name: { in: uniqueNames }
                },
                select: { id: true, name: true }
            });

            const existingNameSet = new Set(existingDbItems.map(i => i.name));

            // 3. Identify New Items and Bulk Create
            const newNames = uniqueNames.filter(name => !existingNameSet.has(name));

            if (newNames.length > 0) {
                await tx.inventoryItem.createMany({
                    data: newNames.map(name => ({
                        name: name,
                        categoryId: targetCategoryId,
                        unit: 'Unidad',
                        currentStock: 0,
                        minStock: 5
                    })),
                    skipDuplicates: true
                });
            }

            // 4. Re-Fetch All Items to get IDs
            const allDbItems = await tx.inventoryItem.findMany({
                where: {
                    name: { in: uniqueNames }
                },
                select: { id: true, name: true }
            });

            const nameToIdMap = new Map<string, string>();
            for (const dbItem of allDbItems) {
                nameToIdMap.set(dbItem.name, dbItem.id);
            }

            // 5. Bulk Create Purchase Records
            const purchaseRecords = uniqueItems.map(item => {
                const itemId = nameToIdMap.get(item.originalName);
                if (!itemId) {
                    throw new Error(`Failed to resolve ID for item: ${item.originalName}`);
                }
                return {
                    itemId: itemId,
                    quantity: item.quantity,
                    price: item.price,
                    supplier: data.supplier,
                    receiptUrl: data.receiptUrl,
                    userId: verifiedUserId // Use the valid user ID
                };
            });

            if (purchaseRecords.length > 0) {
                await tx.inventoryPurchase.createMany({
                    data: purchaseRecords
                });
            }

            // 6. Optimized Stock Update
            const ids: string[] = [];
            let caseString = 'CASE id ';

            for (const item of uniqueItems) {
                const id = nameToIdMap.get(item.originalName);
                if (id) {
                    caseString += `WHEN '${id}' THEN ${item.quantity} `;
                    ids.push(id);
                }
            }
            caseString += 'ELSE 0 END';

            if (ids.length > 0) {
                const idsString = ids.map(id => `'${id}'`).join(',');

                const query = `
                    UPDATE "InventoryItem"
                    SET "currentStock" = "currentStock" + ${caseString},
                    "updatedAt" = NOW()
                    WHERE "id" IN (${idsString})
                `;

                await tx.$executeRawUnsafe(query);
            }
        }, {
            maxWait: 10000,
            timeout: 60000
        });

        revalidatePath('/inventory')
        return { success: true }
    } catch (error) {
        console.error("Bulk purchase high-volume error:", error)
        // Return actual error message for debugging
        return { success: false, error: "Error: " + (error instanceof Error ? error.message : String(error)) }
    }
}
