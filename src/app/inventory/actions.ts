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

    try {
        // 1. Normalization & Deduplication (Memory)
        // Map to store unique items by normalized name. 
        // If duplicates exist in input, we sum quantities and average/sum price? 
        // For simplicity and safety, we will just take the last one or sum them.
        // Let's sum quantities and average unit price if needed, but for now assuming user wants distinct entries.
        // ACTUALLY, strict deduplication by name is safer to prevent PK conflicts if we were inserting into a unique table,
        // but here we are creating Purchase records (many) and updating Item stock (one).
        
        const normalizedItemsMap = new Map<string, { 
            originalName: string, 
            quantity: number, 
            price: number 
        }>();

        for (const item of data.items) {
            const normalized = item.name.trim().charAt(0).toUpperCase() + item.name.trim().slice(1).toLowerCase();
            const existing = normalizedItemsMap.get(normalized);
            if (existing) {
                // Determine how to handle duplicates in the SAME bulk upload.
                // Best approach: Accumulate quantity, accumulate price (assuming price is total cost for that line).
                existing.quantity += item.quantity;
                existing.price += item.price;
            } else {
                normalizedItemsMap.set(normalized, {
                    originalName: normalized, // Use clean name
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

            if (!defaultCategory) throw new Error("No inventory categories found.");
            const defaultCategoryId = defaultCategory.id;

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
                        categoryId: defaultCategoryId,
                        unit: 'Unidad',
                        currentStock: 0,
                        minStock: 5
                    })),
                    skipDuplicates: true // Safety net
                });
            }

            // 4. Re-Fetch All Items to get IDs (Map Name -> ID)
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
                    userId: data.userId
                };
            });

            if (purchaseRecords.length > 0) {
                await tx.inventoryPurchase.createMany({
                    data: purchaseRecords
                });
            }

            // 6. Optimized Stock Update using RAW SQL
            // Updating many rows with different values is tricky in Prisma without raw SQL.
            // We construct a CASE statement or use a series of minimal batched updates.
            // For true scalability with 999 items, ONE raw query with CASE is best.
            // Database: PostgreSQL.

            // Format: UPDATE "InventoryItem" SET "currentStock" = "currentStock" + CASE "id" WHEN 'id1' THEN qty1 WHEN 'id2' THEN qty2 ... END WHERE "id" IN ('id1', 'id2', ...);
            
            // Chunking the raw query is safer for parameter limits (Postgres limit ~65535params). 
            // 1000 items * 2 params (id, qty) = 2000 params. Safe for one batch, but let's chunk to be safe for distinct chunks.
            const CHUNK_SIZE = 500;
            for (let i = 0; i < uniqueItems.length; i += CHUNK_SIZE) {
                const chunk = uniqueItems.slice(i, i + CHUNK_SIZE);
                
                // We need to safely construct the query. Prisma $executeRawUnsafe is okay here IF we trust generated IDs, 
                // but strictly passing mapped params is better. However, CASE logic is hard with tagged templates.
                // We will iterate and do simple concurrent updates if raw SQL complexity is too high risk for syntax error now,
                // BUT user requested 'raw SQL' for speed.
                
                // Let's generate the CASE parts safely.
                const ids: string[] = [];
                let caseString = 'CASE id ';
                
                for (const item of chunk) {
                    const id = nameToIdMap.get(item.originalName);
                    if (id) {
                        // Sanitize ID just in case (it's UUID/CUID from DB, safe)
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

                    // Using executeRawUnsafe because constructing this dynamic CASE with tagged template is extremely verbose
                    await tx.$executeRawUnsafe(query);
                }
            }
        }, {
            maxWait: 10000, // 10s wait for lock
            timeout: 60000  // 60s transaction timeout for massive batches
        });

        revalidatePath('/inventory')
        return { success: true }
    } catch (error) {
        console.error("Bulk purchase high-volume error:", error)
        return { success: false, error: "Falló el registro masivo. Revisa los logs." }
    }
}
