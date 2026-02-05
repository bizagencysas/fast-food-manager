"use server"

import { PrismaClient } from "@prisma/client"
import { revalidatePath } from "next/cache"

const prisma = new PrismaClient()

export async function getFinanceData() {
    const [expenses, investments, withdrawals, purchases] = await Promise.all([
        prisma.expense.findMany({ orderBy: { date: 'desc' }, take: 20 }),
        prisma.partnerInvestment.findMany({ orderBy: { date: 'desc' }, take: 20 }),
        prisma.partnerWithdrawal.findMany({ orderBy: { date: 'desc' }, take: 20 }),
        prisma.inventoryPurchase.findMany({
            orderBy: { date: 'desc' },
            take: 20,
            include: { item: true }
        }),
    ])

    // Serialize
    const serialize = (item: any) => ({
        ...item,
        amount: item.amount.toNumber(),
        date: item.date.toISOString(),
        createdAt: item.createdAt.toISOString(),
    })

    // Transform purchases to expense format
    const purchaseExpenses = purchases.map(p => ({
        id: p.id,
        category: "Materia Prima",
        description: `Compra: ${p.item.name} (Cant: ${p.quantity})`,
        amount: p.price, // Decimal to be serialized
        receiptUrl: p.receiptUrl,
        date: p.date,
        createdAt: p.createdAt,
        userId: p.userId,
        type: 'purchase' // Marker
    })).map(serialize)

    const normalExpenses = expenses.map(serialize)

    // Merge and sort
    const allExpenses = [...normalExpenses, ...purchaseExpenses].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    )

    return {
        expenses: allExpenses,
        investments: investments.map(serialize),
        withdrawals: withdrawals.map(serialize)
    }
}

// Helper to ensure user exists
async function getAdminUser() {
    return await prisma.user.upsert({
        where: { email: 'freddy' },
        update: {},
        create: {
            email: 'freddy',
            name: 'Freddy Admin',
            passwordHash: 'freddy',
            role: 'ADMIN'
        }
    })
}

export async function recordExpense(data: {
    category: string,
    description: string,
    amount: number,
    receiptUrl?: string,
    userId: string // Keeping signature but will ignore passed ID in favor of admin for now
}) {
    try {
        const user = await getAdminUser()
        await prisma.expense.create({
            data: {
                category: data.category,
                description: data.description,
                amount: data.amount,
                receiptUrl: data.receiptUrl,
                userId: user.id
            }
        })
        revalidatePath('/finance')
        return { success: true }
    } catch (error) {
        console.error("Expense error:", error)
        return { success: false, error: String(error) }
    }
}

export async function recordInvestment(data: {
    partnerName: string,
    amount: number,
    type: string,
    description?: string,
    proofUrl?: string,
    userId: string
}) {
    try {
        const user = await getAdminUser()
        await prisma.partnerInvestment.create({
            data: {
                ...data,
                userId: user.id
            }
        })
        revalidatePath('/finance')
        return { success: true }
    } catch (error) {
        console.error("Investment error:", error)
        return { success: false, error: String(error) }
    }
}

export async function recordWithdrawal(data: {
    partnerName: string,
    amount: number,
    concept: string,
    userId: string
}) {
    try {
        const user = await getAdminUser()
        await prisma.partnerWithdrawal.create({
            data: {
                ...data,
                userId: user.id
            }
        })
        revalidatePath('/finance')
        return { success: true }
    } catch (error) {
        console.error("Withdrawal error:", error)
        return { success: false, error: String(error) }
    }
}
