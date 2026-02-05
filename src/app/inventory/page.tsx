import { getInventory } from "./actions";
import InventoryInterface from "./inventory-interface";

export const dynamic = 'force-dynamic'

export default async function InventoryPage() {
    const items = await getInventory();

    return (
        <InventoryInterface initialItems={items} />
    )
}
