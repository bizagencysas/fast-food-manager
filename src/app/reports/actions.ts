"use server"

import { PrismaClient } from "@prisma/client"
import { startOfDay, endOfDay, subDays } from "date-fns"

const prisma = new PrismaClient()

export async function getDailyReport(dateInput?: string) {
    const date = dateInput ? new Date(dateInput) : new Date()
    const start = startOfDay(date)
    const end = endOfDay(date)

    const [sales, expenses, purchases] = await Promise.all([
        prisma.sale.findMany({
            where: { date: { gte: start, lte: end } },
            include: { items: { include: { product: true } } }
        }),
        prisma.expense.findMany({
            where: { date: { gte: start, lte: end } }
        }),
        prisma.inventoryPurchase.findMany({
            where: { date: { gte: start, lte: end } }
        })
    ])

    const totalSales = sales.reduce((sum, s) => sum + s.total.toNumber(), 0)
    const expenseTotal = expenses.reduce((sum, e) => sum + e.amount.toNumber(), 0)
    const purchaseTotal = purchases.reduce((sum, p) => sum + p.price.toNumber(), 0)

    const totalExpenses = expenseTotal + purchaseTotal
    const utility = totalSales - totalExpenses

    // Sales by Product
    const productSales: Record<string, number> = {}
    sales.forEach(sale => {
        sale.items.forEach(item => {
            const productName = item.product.name
            productSales[productName] = (productSales[productName] || 0) + item.quantity
        })
    })

    const topProducts = Object.entries(productSales)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, quantity]) => ({ name, quantity }))

    return {
        date: date.toISOString(),
        totalSales,
        totalExpenses,
        utility,
        transactionCount: sales.length,
        topProducts
    }
}
