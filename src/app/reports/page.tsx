import { getDailyReport } from "./actions";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = 'force-dynamic'

export default async function ReportsPage() {
    const report = await getDailyReport();

    return (
        <AppLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Reporte Diario</h2>
                    <a
                        href={`https://wa.me/573026684956?text=Reporte%20del%20Dia:%20Ventas%20$${report.totalSales}%20(Bs.${report.totalSalesBs.toFixed(2)})%20-%20Gastos%20$${report.totalExpenses}%20-%20Utilidad%20$${report.utility}`}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <Button className="bg-green-600 hover:bg-green-700">Enviar por WhatsApp</Button>
                    </a>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Ventas Totales</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">${report.totalSales.toFixed(2)}</div>
                            {report.totalSalesBs > 0 && (
                                <div className="text-sm text-gray-500 font-medium mt-1">
                                    Bs. {report.totalSalesBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Gastos del Día</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-500">${report.totalExpenses.toFixed(2)}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Utilidad Neta</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-600">${report.utility.toFixed(2)}</div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Productos Más Vendidos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {report.topProducts.map((p, i) => (
                                    <div key={i} className="flex justify-between items-center border-b pb-2 last:border-0">
                                        <span className="font-medium">{p.name}</span>
                                        <span className="font-bold">{p.quantity}</span>
                                    </div>
                                ))}
                                {report.topProducts.length === 0 && <p className="text-gray-500">Sin ventas hoy.</p>}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    )
}
