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
    // Sum totalBs if available (historical accuracy), otherwise use current rate? 
    // Plan says strict historical, so if null (old sales), we assume 0 or handle globally.
    // For now, simple sum.
    const totalSalesBs = sales.reduce((sum, s) => sum + (s.totalBs?.toNumber() || 0), 0)

    const expenseTotal = expenses.reduce((sum, e) => sum + e.amount.toNumber(), 0)
    const purchaseTotal = purchases.reduce((sum, p) => sum + p.price.toNumber(), 0)

    const totalExpenses = expenseTotal + purchaseTotal
    const utility = totalSales - totalExpenses
    // Expenses are usually in USD in this system. If we want Utility in Bs, we'd need expenses in Bs.
    // User asked "close a report in dollars and another in Bs".
    // Assuming expenses are USD, we can't easily get utility in Bs without exchange rate history for expenses.
    // I will return totalSalesBs for now as requested.

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
        totalSalesBs,
        totalExpenses,
        utility,
        transactionCount: sales.length,
        topProducts
    }
}
