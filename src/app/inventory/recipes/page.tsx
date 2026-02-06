import { getProductsWithRecipes, getInventoryItems } from "./actions"
import RecipesInterface from "./recipes-interface"

export const dynamic = 'force-dynamic'

export default async function RecipesPage() {
    const [products, inventoryItems] = await Promise.all([
        getProductsWithRecipes(),
        getInventoryItems()
    ])

    return <RecipesInterface products={products} inventoryItems={inventoryItems} />
}
