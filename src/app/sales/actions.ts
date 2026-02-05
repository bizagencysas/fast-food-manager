"use server"

import { PrismaClient, PaymentMethod } from "@prisma/client"

const prisma = new PrismaClient()

export async function getProducts() {
    // ... existing code ...
    // Ensure "BEBIDA" product exists (Placeholder)
    const bebidaProduct = await prisma.product.findFirst({ where: { name: "Bebida", category: "BEBIDA" } })
    if (!bebidaProduct) {
        await prisma.product.create({
            data: {
                name: "Bebida",
                category: "BEBIDA",
                price: 1.00,
                active: true
            }
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

        const sale = await prisma.sale.create({
            data: {
                userId: user.id,
                total: data.total,
                paymentMethod: data.paymentMethod as PaymentMethod,
                paymentReference: data.paymentReference, // Save reference
                notes: data.notes,
                items: {
                    create: data.items.map(item => {
                        // If productId looks like a temp ID (starts with 'custom-'), switch to generic ID
                        const isCustom = item.productId.startsWith('custom-')
                        return {
                            productId: isCustom ? customProductId : item.productId,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            subtotal: item.quantity * item.unitPrice,
                            // Save the specific name/desc
                            productName: item.name || (isCustom ? "Item Personalizado" : undefined)
                        }
                    })
                }
            }
        })
        return { success: true, saleId: sale.id }
    } catch (error) {
        console.error("Sale creation error:", error)
        return { success: false, error: String(error) }
    }
}
