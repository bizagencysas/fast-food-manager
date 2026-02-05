"use client"

import { useState } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Upload, Loader2, ArrowRight, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import { uploadImage } from "@/app/actions/upload"
import { recordExpense, recordInvestment, recordWithdrawal } from "./actions"
import { uploadBankStatement } from "./statements-actions"

export default function FinanceInterface({ data }: { data: any }) {
    const [activeTab, setActiveTab] = useState("expenses")
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Generic Form State (simplified for demo)
    const [formData, setFormData] = useState({
        category: "",
        description: "",
        amount: "",
        partnerName: "",
        type: "",
        concept: "",
    })
    const [file, setFile] = useState<File | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        let receiptUrl = undefined

        if (file) {
            const fd = new FormData()
            fd.append('file', file)
            const res = await uploadImage(fd)
            if (res.success) receiptUrl = res.url
        }

        let result;
        const userId = "mock-user-id"

        if (activeTab === "expenses") {
            result = await recordExpense({
                category: formData.category,
                description: formData.description,
                amount: Number(formData.amount),
                receiptUrl,
                userId
            })
        } else if (activeTab === "investments") {
            result = await recordInvestment({
                partnerName: formData.partnerName,
                amount: Number(formData.amount),
                type: formData.type, // e.g., capital inicial
                description: formData.description,
                proofUrl: receiptUrl,
                userId
            })
        } else if (activeTab === "withdrawals") {
            result = await recordWithdrawal({
                partnerName: formData.partnerName,
                amount: Number(formData.amount),
                concept: formData.concept,
                userId
            })
        } else if (activeTab === "statements") {
            if (!receiptUrl) { alert("Sube un archivo"); setIsSubmitting(false); return; }
            result = await uploadBankStatement({
                month: new Date().getMonth() + 1, // Simple default
                year: new Date().getFullYear(),
                bank: formData.category || "Banco", // Recycling category field for Bank name
                fileUrl: receiptUrl,
                userId
            })
        }

        if (result && result.success) {
            alert("Registro exitoso")
            setFormData({ category: "", description: "", amount: "", partnerName: "", type: "", concept: "" })
            setFile(null)
        } else {
            alert("Error al registrar")
        }
        setIsSubmitting(false)
    }

    return (
        <AppLayout>
            <div className="space-y-6">
                <h2 className="text-2xl font-bold">Finanzas</h2>

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="expenses">Gastos</TabsTrigger>
                        <TabsTrigger value="investments">Inversiones</TabsTrigger>
                        <TabsTrigger value="withdrawals">Retiros</TabsTrigger>
                        <TabsTrigger value="statements">Extractos</TabsTrigger>
                    </TabsList>

                    <div className="mt-6 grid gap-6 md:grid-cols-2">
                        {/* Form Section */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Registrar Nuevo</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmit} className="space-y-4">

                                    {activeTab === "expenses" && (
                                        <>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Categoría</label>
                                                <select
                                                    className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm"
                                                    value={formData.category}
                                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                                    required
                                                >
                                                    <option value="">Seleccionar...</option>
                                                    <option value="Transporte">Transporte</option>
                                                    <option value="Servicios">Servicios</option>
                                                    <option value="Alquiler">Alquiler</option>
                                                    <option value="Mantenimiento">Mantenimiento</option>
                                                    <option value="Otros">Otros</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Descripción</label>
                                                <Input
                                                    value={formData.description}
                                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                                    placeholder="Detalle del gasto"
                                                    required
                                                />
                                            </div>
                                        </>
                                    )}

                                    {(activeTab === "investments" || activeTab === "withdrawals") && (
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Socio</label>
                                            <Input
                                                value={formData.partnerName}
                                                onChange={e => setFormData({ ...formData, partnerName: e.target.value })}
                                                required
                                            />
                                        </div>
                                    )}

                                    {activeTab === "investments" && (
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Tipo</label>
                                            <select
                                                className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm"
                                                value={formData.type}
                                                onChange={e => setFormData({ ...formData, type: e.target.value })}
                                                required
                                            >
                                                <option value="">Seleccionar...</option>
                                                <option value="Capital Inicial">Capital Inicial</option>
                                                <option value="Reposición">Reposición</option>
                                                <option value="Emergencia">Emergencia</option>
                                            </select>
                                        </div>
                                    )}

                                    {activeTab === "withdrawals" && (
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Concepto</label>
                                            <select
                                                className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm"
                                                value={formData.concept}
                                                onChange={e => setFormData({ ...formData, concept: e.target.value })}
                                                required
                                            >
                                                <option value="">Seleccionar...</option>
                                                <option value="Sueldo Vendedor">Sueldo Vendedor</option>
                                                <option value="Pago Socio">Pago Socio</option>
                                                <option value="Otro">Otro</option>
                                            </select>
                                        </div>
                                    )}

                                    {activeTab === "statements" && (
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Banco</label>
                                            <Input
                                                value={formData.category} // Reuse category for Bank Name
                                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                                                placeholder="Nombre del Banco"
                                                required
                                            />
                                        </div>
                                    )}

                                    {activeTab !== "statements" && (
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Monto</label>
                                            <Input
                                                type="number"
                                                value={formData.amount}
                                                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                                required
                                            />
                                        </div>
                                    )}

                                    {(activeTab !== "withdrawals") && (
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">{activeTab === "statements" ? "Archivo (PDF/Img)" : "Comprobante (Opcional)"}</label>
                                            <Input
                                                type="file"
                                                onChange={e => setFile(e.target.files?.[0] || null)}
                                                required={activeTab === "statements"}
                                            />
                                        </div>
                                    )}

                                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                                        {isSubmitting ? <Loader2 className="animate-spin" /> : "Guardar"}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>

                        {/* List Section */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Historial Reciente</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {data[activeTab]?.length === 0 ? (
                                        <p className="text-gray-500 text-sm">No hay registros.</p>
                                    ) : (
                                        data[activeTab]?.map((item: any) => (
                                            <div key={item.id} className="flex justify-between items-center border-b pb-2 last:border-0">
                                                <div>
                                                    <p className="font-medium text-sm">{item.description || item.concept || item.category}</p>
                                                    <p className="text-xs text-gray-500">{new Date(item.date || item.createdAt).toLocaleDateString()}</p>
                                                    {item.partnerName && <p className="text-xs text-blue-600">{item.partnerName}</p>}
                                                </div>
                                                <span className={cn(
                                                    "font-bold",
                                                    activeTab === "withdrawals" || activeTab === "expenses" ? "text-red-500" : "text-green-600"
                                                )}>
                                                    ${item.amount.toFixed(2)}
                                                </span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </Tabs>
            </div>
        </AppLayout>
    )
}
