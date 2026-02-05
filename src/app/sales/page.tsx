import { getProducts } from "./actions";
import SalesInterface from "./sales-interface";

// Force dynamic since products might change and we want fresh data
export const dynamic = 'force-dynamic'

export default async function SalesPage() {
    const products = await getProducts();

    return (
        <SalesInterface initialProducts={products} />
    )
}
