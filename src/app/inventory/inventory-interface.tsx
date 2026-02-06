"use client"

import { useState, useEffect } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Plus, Search, AlertTriangle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog" // Need to install or create Dialog
// For now I'll create a simple modal overlay manually to avoid dependency hell or install dialog.
// I will create a basic Modal component in this file or use conditional rendering.

import { uploadImage } from "@/app/actions/upload"
import { recordPurchase, recordBulkPurchase } from "./actions"
import { getBCVRate } from "@/app/actions/bcv"
import { compressImage } from "@/lib/image-compression"

// Types
type InventoryItem = {
    id: string
    name: string
    unit: string
    currentStock: number
    minStock: number
    category: { name: string }
}

interface InventoryPageProps {
    initialItems: InventoryItem[]
}

export default function InventoryInterface({ initialItems }: InventoryPageProps) {
    const [mainSearchTerm, setMainSearchTerm] = useState("")
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [exchangeRate, setExchangeRate] = useState<number | null>(null)

    // Bulk Form State - Added priceBs
    const [purchaseItems, setPurchaseItems] = useState([{ name: "", quantity: "", price: "", priceBs: "" }])

    // Autocomplete State
    const [items, setItems] = useState<InventoryItem[]>(initialItems)
    const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null)
    const [isMenuOpen, setIsMenuOpen] = useState(false)


    // Update items state if initialItems changes
    useEffect(() => {
        setItems(initialItems);
    }, [initialItems]);

    // Fetch BCV Rate on mount
    useEffect(() => {
        getBCVRate().then(res => {
            if (res.success && res.rate) {
                setExchangeRate(res.rate)
            }
        })
    }, [])

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(mainSearchTerm.toLowerCase()) ||
        item.category.name.toLowerCase().includes(mainSearchTerm.toLowerCase())
    )

    // Helper to calculate total
    const totalCost = purchaseItems.reduce((sum, item) => sum + (Number(item.price) || 0), 0)

    const handleRowChange = (index: number, field: string, value: string) => {
        const newItems = [...purchaseItems]

        if (field === 'name') {
            const capitalized = value.charAt(0).toUpperCase() + value.slice(1)
            newItems[index] = { ...newItems[index], name: capitalized }
            setActiveRowIndex(index)
            setIsMenuOpen(true)
        } else if (field === 'priceBs') {
            // Handle BS change: Update BS and calculate USD
            newItems[index] = { ...newItems[index], priceBs: value }
            if (exchangeRate && !isNaN(Number(value))) {
                const usdPrice = Number(value) / exchangeRate
                newItems[index].price = usdPrice.toFixed(2)
            } else if (value === "") {
                newItems[index].price = ""
            }
        } else if (field === 'price') {
            // Handle USD change: Update USD (clears BS slightly to indicate override or keep as is? Let's just update USD)
            // Ideally if they edit USD, we should probably update BS if we want strict sync, but usually USD is master.
            // We'll leave BS as is or clear it if it doesn't match? Let's just update USD logic.
            newItems[index] = { ...newItems[index], price: value }
        } else {
            (newItems[index] as any)[field] = value
        }

        setPurchaseItems(newItems)
    }

    const addRow = () => {
        setPurchaseItems([...purchaseItems, { name: "", quantity: "", price: "", priceBs: "" }])
    }

    const removeRow = (index: number) => {
        if (purchaseItems.length === 1) return;
        const newItems = purchaseItems.filter((_, i) => i !== index)
        setPurchaseItems(newItems)
    }

    const handleBulkPurchase = async (e: React.FormEvent) => {
        e.preventDefault()

        import { compressImage } from "@/lib/image-compression"

        // ... types ...

        // ... inside component ...

        const handleBulkPurchase = async (e: React.FormEvent) => {
            e.preventDefault()

            // Validate
            if (!file) { alert("La foto de la factura es obligatoria."); return; }
            if (purchaseItems.some(i => !i.name || !i.quantity || !i.price)) {
                alert("Completa todos los campos de los insumos (Nombre, Cantidad y Costo $)."); return;
            }

            setIsSubmitting(true)
            let receiptUrl = ""

            try {
                // Compress Image
                const compressedFile = await compressImage(file)

                // Upload Image
                const formData = new FormData()
                formData.append('file', compressedFile)
                const uploadRes = await uploadImage(formData)

                if (uploadRes.success) {
                    receiptUrl = uploadRes.url
                } else {
                    alert("Error al subir imagen: " + uploadRes.error)
                    setIsSubmitting(false)
                    return
                }
            } catch (error) {
                console.error("Compression/Upload error:", error)
                alert("Error al procesar la imagen.")
                setIsSubmitting(false)
                return
            }

            // Submit Bulk Logic
            const result = await recordBulkPurchase({
                items: purchaseItems.map(i => ({
                    name: i.name,
                    quantity: Number(i.quantity),
                    price: Number(i.price)
                })),
                receiptUrl,
                userId: "mock-user-id"
            })

            if (result.success) {
                alert("Compra registrada correctamente!")
                setIsModalOpen(false)
                setPurchaseItems([{ name: "", quantity: "", price: "", priceBs: "" }])
                setFile(null)
            } else {
                alert("Error: " + result.error)
            }
            setIsSubmitting(false)
        }

        // ... getSuggestions ...
        const getSuggestions = () => {
            if (activeRowIndex === null) return []
            const currentName = purchaseItems[activeRowIndex].name.toLowerCase()
            return items.filter(i => i.name.toLowerCase().includes(currentName))
        }

        return (
            <AppLayout>
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <h2 className="text-2xl font-bold text-black">Inventario</h2>
                        <Button onClick={() => setIsModalOpen(true)} className="bg-black text-white hover:bg-gray-800 shadow-md">
                            <Plus className="w-4 h-4 mr-2" />
                            Nueva Compra
                        </Button>
                    </div>

                    {/* Search and Grid of Products (Same as before) */}
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                            <Input
                                placeholder="Buscar insumo..."
                                className="pl-9 text-black bg-white"
                                value={mainSearchTerm}
                                onChange={(e) => setMainSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filteredItems.map(item => {
                            const isLowStock = item.currentStock <= item.minStock
                            return (
                                <Card key={item.id} className={cn("transition-all bg-white border-gray-200", isLowStock ? "border-red-200 bg-red-50" : "")}>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <div className="space-y-1">
                                            <CardTitle className="text-base font-semibold text-black">{item.name}</CardTitle>
                                            <p className="text-xs text-black">{item.category.name}</p>
                                        </div>
                                        {isLowStock && <AlertTriangle className="h-5 w-5 text-red-500" />}
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-black">
                                            {item.currentStock} <span className="text-sm font-normal text-black">{item.unit}</span>
                                        </div>
                                        <p className="text-xs text-black mt-1">
                                            Mínimo: {item.minStock} {item.unit}
                                        </p>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>

                    {/* Simple Modal Overlay */}
                    {isModalOpen && (
                        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
                            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl p-6 animate-in fade-in zoom-in duration-200">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-bold text-black">Registrar Compra Múltiple</h3>
                                    {exchangeRate && (
                                        <span className="text-sm px-2 py-1 bg-green-100 text-green-800 rounded font-medium">
                                            Tasa BCV: {exchangeRate.toFixed(2)} Bs/$
                                        </span>
                                    )}
                                </div>

                                <form onSubmit={handleBulkPurchase} className="space-y-4">

                                    <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                                        {/* Responsive Headers: Hidden on mobile, shown on md+ */}
                                        <div className="hidden md:grid grid-cols-12 gap-2 text-sm font-medium text-black mb-2">
                                            <div className="col-span-4">Insumo</div>
                                            <div className="col-span-2">Cant.</div>
                                            <div className="col-span-3">Costo Unit (Bs)</div>
                                            <div className="col-span-3">Costo Unit ($)</div>
                                        </div>

                                        {purchaseItems.map((row, index) => (
                                            <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start relative group p-4 md:p-0 border md:border-none rounded md:rounded-none mb-2 md:mb-0 bg-gray-50 md:bg-white">

                                                {/* Insumo */}
                                                <div className="md:col-span-4 relative space-y-1 md:space-y-0">
                                                    <label className="md:hidden text-xs font-bold text-gray-500">Insumo</label>
                                                    <Input
                                                        value={row.name}
                                                        onChange={e => handleRowChange(index, 'name', e.target.value)}
                                                        placeholder="Nombre Insumo"
                                                        onFocus={() => { setActiveRowIndex(index); setIsMenuOpen(true) }}
                                                        onBlur={() => setTimeout(() => { if (activeRowIndex === index) setIsMenuOpen(false) }, 200)}
                                                        className="w-full text-black placeholder:text-gray-400"
                                                    />
                                                    {/* Autocomplete Dropdown */}
                                                    {activeRowIndex === index && isMenuOpen && row.name.length > 0 && (
                                                        <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-auto mt-1">
                                                            {getSuggestions().map(item => (
                                                                <div
                                                                    key={item.id}
                                                                    className="p-2 hover:bg-gray-100 cursor-pointer text-sm text-black"
                                                                    onClick={() => {
                                                                        handleRowChange(index, 'name', item.name)
                                                                        setIsMenuOpen(false)
                                                                    }}
                                                                >
                                                                    {item.name}
                                                                </div>
                                                            ))}
                                                            {getSuggestions().length === 0 && (
                                                                <div className="p-2 text-gray-500 text-xs italic">
                                                                    Nuevo: "{row.name}"
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Cantidad */}
                                                <div className="md:col-span-2 space-y-1 md:space-y-0">
                                                    <label className="md:hidden text-xs font-bold text-gray-500">Cantidad</label>
                                                    <Input
                                                        type="number"
                                                        value={row.quantity}
                                                        onChange={e => handleRowChange(index, 'quantity', e.target.value)}
                                                        placeholder="Cant."
                                                        className="text-black placeholder:text-gray-400"
                                                    />
                                                </div>

                                                {/* Costo Bs */}
                                                <div className="md:col-span-3 space-y-1 md:space-y-0">
                                                    <label className="md:hidden text-xs font-bold text-gray-500">Costo Unit (Bs)</label>
                                                    <Input
                                                        type="number"
                                                        value={row.priceBs}
                                                        onChange={e => handleRowChange(index, 'priceBs', e.target.value)}
                                                        placeholder="Bs. (Opcional)"
                                                        className="text-black placeholder:text-gray-400 bg-blue-50 border-blue-100 focus:border-blue-300"
                                                    />
                                                </div>

                                                {/* Costo USD and Delete */}
                                                <div className="md:col-span-3 flex gap-1 space-y-1 md:space-y-0">
                                                    <div className="flex-1">
                                                        <label className="md:hidden text-xs font-bold text-gray-500">Costo Unit ($)</label>
                                                        <Input
                                                            type="number"
                                                            value={row.price}
                                                            onChange={e => handleRowChange(index, 'price', e.target.value)}
                                                            placeholder="$ (Final)"
                                                            className="text-black placeholder:text-gray-400 font-bold"
                                                        />
                                                    </div>
                                                    {purchaseItems.length > 1 && (
                                                        <div className="md:pt-0 pt-5">
                                                            <button
                                                                type="button"
                                                                onClick={() => removeRow(index)}
                                                                className="text-red-500 hover:text-red-700 px-2 h-10 w-10 flex items-center justify-center font-bold bg-white rounded border border-red-100"
                                                            >
                                                                &times;
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}

                                        <Button type="button" variant="outline" size="sm" onClick={addRow} className="mt-2 w-full border-dashed text-black hover:bg-gray-50">
                                            <Plus className="w-4 h-4 mr-2" /> Agregar otro insumo
                                        </Button>
                                    </div>

                                    <div className="border-t pt-4 space-y-4">
                                        <div className="flex justify-between font-bold text-lg text-black">
                                            <span>Total Factura:</span>
                                            <span>${totalCost.toFixed(2)}</span>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-black">Foto Factura (Obligatorio)</label>
                                            <Input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                                required
                                                className="text-black"
                                            />
                                        </div>

                                        <div className="flex justify-end gap-2 pt-2">
                                            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="text-black border-black hover:bg-gray-100">
                                                Cancelar
                                            </Button>
                                            <Button type="submit" disabled={isSubmitting} className="bg-black text-white hover:bg-gray-800 shadow-md">
                                                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                                Guardar Todo
                                            </Button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </AppLayout>
        )
    }
