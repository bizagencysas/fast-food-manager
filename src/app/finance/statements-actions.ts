"use server"

import { PrismaClient } from "@prisma/client"
import { revalidatePath } from "next/cache"

const prisma = new PrismaClient()

export async function getBankStatements() {
    const statements = await prisma.bankStatement.findMany({
        orderBy: { uploadedAt: 'desc' }
    })

    return statements.map(s => ({
        ...s,
        uploadedAt: s.uploadedAt.toISOString()
    }))
}

export async function uploadBankStatement(data: {
    month: number,
    year: number,
    bank: string,
    fileUrl: string,
    userId: string
}) {
    try {
        await prisma.bankStatement.create({
            data: {
                month: data.month,
                year: data.year,
                bank: data.bank,
                fileUrl: data.fileUrl,
                userId: data.userId
            }
        })
        revalidatePath('/finance')
        return { success: true }
    } catch (error) {
        return { success: false, error: "Failed to upload statement" }
    }
}
