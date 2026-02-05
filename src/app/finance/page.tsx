import { getFinanceData } from "./actions";
import FinanceInterface from "./finance-interface";

export const dynamic = 'force-dynamic'

export default async function FinancePage() {
    const data = await getFinanceData();

    return (
        <FinanceInterface data={data} />
    )
}
