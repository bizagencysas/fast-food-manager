"use server"

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function getProducts() {
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
    items: { productId: string, quantity: number, unitPrice: number }[],
    total: number,
    paymentMethod: "CASH" | "TRANSFER" | "MOBILE_PAYMENT",
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
                passwordHash: 'freddy', // In real app, hash this
                role: 'ADMIN'
            }
        })

        const sale = await prisma.sale.create({
            data: {
                userId: user.id,
                total: data.total,
                paymentMethod: data.paymentMethod, // Matches specific string union
                notes: data.notes,
                items: {
                    create: data.items.map(item => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        subtotal: item.quantity * item.unitPrice
                    }))
                }
            }
        })
        return { success: true, saleId: sale.id }
    } catch (error) {
        console.error("Sale creation error:", error)
        // Return the actual error message for debugging
        return { success: false, error: String(error) }
    }
}
