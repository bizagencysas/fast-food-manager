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

export async function recordExpense(data: {
    category: string,
    description: string,
    amount: number,
    receiptUrl?: string,
    userId: string
}) {
    try {
        await prisma.expense.create({
            data: {
                category: data.category,
                description: data.description,
                amount: data.amount,
                receiptUrl: data.receiptUrl,
                userId: data.userId
            }
        })
        revalidatePath('/finance')
        return { success: true }
    } catch (error) {
        return { success: false, error: "Failed to create expense" }
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
        await prisma.partnerInvestment.create({
            data: { ...data }
        })
        revalidatePath('/finance')
        return { success: true }
    } catch (error) {
        return { success: false, error: "Failed to record investment" }
    }
}

export async function recordWithdrawal(data: {
    partnerName: string,
    amount: number,
    concept: string,
    userId: string
}) {
    try {
        await prisma.partnerWithdrawal.create({
            data: { ...data }
        })
        revalidatePath('/finance')
        return { success: true }
    } catch (error) {
        return { success: false, error: "Failed to record withdrawal" }
    }
}
