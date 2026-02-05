
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
    try {
        console.log('Deleting all SaleItems...')
        await prisma.saleItem.deleteMany({})

        console.log('Deleting all Sales...')
        await prisma.sale.deleteMany({})

        console.log('✅ Sales data cleared successfully.')
    } catch (error) {
        console.error('Error clearing data:', error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
