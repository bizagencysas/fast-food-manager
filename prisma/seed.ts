const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const INITIAL_PRODUCTS = [
    { name: 'Hamburguesa Clásica', category: 'HAMBURGUESA', price: 5.00 },
    { name: 'Hamburguesa Pollo Crispy', category: 'HAMBURGUESA', price: 7.00 },
    { name: 'Perro Normal', category: 'PERRO', price: 2.00 },
    { name: 'Perro con Huevo', category: 'PERRO', price: 2.50 },
    { name: 'Perro con Carne', category: 'PERRO', price: 3.50 },
    { name: 'Papas Fritas (Porción)', category: 'PAPAS', price: 2.50 },
    { name: 'Salchipapas', category: 'PAPAS', price: 5.00 },
]

const INVENTORY_CATEGORIES = [
    'SALSAS',
    'PROTEÍNAS',
    'OTROS',
    'DESECHABLES'
]

async function main() {
    console.log('Start seeding ...')

    // Seed Products
    for (const p of INITIAL_PRODUCTS) {
        const product = await prisma.product.create({
            data: p,
        })
        console.log(`Created product with id: ${product.id}`)
    }

    // Seed Inventory Categories
    for (const name of INVENTORY_CATEGORIES) {
        await prisma.inventoryCategory.upsert({
            where: { name },
            update: {},
            create: { name },
        })
        console.log(`Created category: ${name}`)
    }

    console.log('Seeding finished.')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
