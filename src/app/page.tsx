import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, ShoppingBag, TrendingUp, Users } from "lucide-react";
import { getDailyReport } from "./reports/actions";

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const data = await getDailyReport();

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight text-black">Reporte Diario</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-black">Ventas Hoy</CardTitle>
              <DollarSign className="h-4 w-4 text-black" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-black">${data.totalSales.toFixed(2)}</div>
              <p className="text-xs text-black font-medium">
                Ventas registradas hoy
                {data.totalSalesBs > 0 && <span className="block text-gray-500 mt-1">Has hecho: {data.totalSalesBs.toFixed(2)} Bs</span>}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-black">Transacciones</CardTitle>
              <ShoppingBag className="h-4 w-4 text-black" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-black">{data.transactionCount}</div>
              <p className="text-xs text-black font-medium">
                Pedidos procesados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-black">Gastos Hoy</CardTitle>
              <TrendingUp className="h-4 w-4 text-black" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">${data.totalExpenses.toFixed(2)}</div>
              <p className="text-xs text-black font-medium">
                Compras e Insumos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-black">Utilidad Neta</CardTitle>
              <Users className="h-4 w-4 text-black" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${data.utility >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${data.utility.toFixed(2)}
              </div>
              <p className="text-xs text-black font-medium">
                Margen del día
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-7">
            <CardHeader>
              <CardTitle>Productos Top (Hoy)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.topProducts.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No hay ventas registradas hoy.</p>
                ) : (
                  data.topProducts.map((product, i) => (
                    <div key={i} className="flex items-center">
                      <div className="ml-4 space-y-1">
                        <p className="text-sm font-medium leading-none">{product.name}</p>
                        <p className="text-xs text-gray-500">{product.quantity} unidades</p>
                      </div>
                      {/* <div className="ml-auto font-medium">Use a real value if available</div> */}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
