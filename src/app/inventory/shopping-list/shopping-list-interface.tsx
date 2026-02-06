"use client"

import { useState, useEffect } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ShoppingCart, Check, Trash2, DollarSign, ExternalLink } from "lucide-react"
import { getShoppingList, confirmShoppingListPurchase, removeFromList } from "./actions"
import { getBCVRate } from "@/app/actions/bcv"

interface ShoppingItem {
    id: string
    inventoryItemId: string
    quantity: number
    estimatedPrice: number // Stored as Unit Cost mostly
    inventoryItem: {
        name: string
        unit: string
        lastCost: number | null
    }
}

export default function ShoppingListInterface() {
    const [items, setItems] = useState<ShoppingItem[]>([])
    const [loading, setLoading] = useState(true)
    const [exchangeRate, setExchangeRate] = useState<number | null>(null)

    // Selection state
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

    // Form state for confirming purchase
    const [isConfirming, setIsConfirming] = useState(false)
    const [supplier, setSupplier] = useState("")

    // Edited values (to override quantity/price before buying)
    const [edits, setEdits] = useState<Record<string, { quantity: number, totalPrice: number, priceBs: number }>>({})

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        const [listData, bcvData] = await Promise.all([
            getShoppingList(),
            getBCVRate()
        ])

        if (bcvData.success) setExchangeRate(bcvData.rate)

        setItems(listData)

        // Initialize edits with current values
        const initialEdits: any = {}
        const initialSelected = new Set<string>()

        listData.forEach(item => {
            // Estimate Total Price = Qty * UnitCost
            // If estimatedPrice in DB is Unit Cost, then:
            const unitCost = Number(item.estimatedPrice || item.inventoryItem.lastCost || 0)
            const totalUSD = unitCost * item.quantity

            initialEdits[item.id] = {
                quantity: item.quantity,
                totalPrice: totalUSD,
                priceBs: bcvData.rate ? (totalUSD * bcvData.rate) : 0
            }
            // Auto-select everything by default? Maybe better to let user choose.
            // Let's select all for convenience.
            initialSelected.add(item.id)
        })

        setEdits(initialEdits)
        setSelectedIds(initialSelected)
        setLoading(false)
    }

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds)
        if (newSet.has(id)) newSet.delete(id)
        else newSet.add(id)
        setSelectedIds(newSet)
    }

    const handleEditChange = (id: string, field: 'quantity' | 'totalPrice' | 'priceBs', value: string) => {
        const numVal = parseFloat(value) || 0
        const current = edits[id]

        if (field === 'quantity') {
            setEdits(prev => ({
                ...prev,
                [id]: { ...current, quantity: numVal }
            }))
        } else if (field === 'priceBs') {
            // Update Bs -> Calc USD
            const usd = exchangeRate ? (numVal / exchangeRate) : 0
            setEdits(prev => ({
                ...prev,
                [id]: { ...current, priceBs: numVal, totalPrice: usd }
            }))
        } else if (field === 'totalPrice') {
            // Update USD -> Calc Bs
            const bs = exchangeRate ? (numVal * exchangeRate) : 0
            setEdits(prev => ({
                ...prev,
                [id]: { ...current, totalPrice: numVal, priceBs: bs }
            }))
        }
    }

    const handleConfirmPurchase = async () => {
        if (selectedIds.size === 0) return
        if (!confirm("¿Registrar compra de los productos seleccionados y actualizar inventario?")) return

        setIsConfirming(true)

        const itemsToBuy = Array.from(selectedIds).map(id => {
            return {
                id,
                quantity: edits[id].quantity,
                price: edits[id].totalPrice
            }
        })

        const res = await confirmShoppingListPurchase({
            items: itemsToBuy,
            supplier: supplier || "Varios",
            userId: "current-user" // Server will fix
        })

        if (res.success) {
            alert("¡Compra registrada y stock actualizado!")
            loadData() // Refresh
        } else {
            alert("Error: " + res.error)
        }
        setIsConfirming(false)
    }

    const handleRemove = async (id: string) => {
        if (!confirm("¿Quitar de la lista?")) return
        await removeFromList(id)
        loadData()
    }

    const totalEstimatedUSD = Array.from(selectedIds).reduce((sum, id) => sum + (edits[id]?.totalPrice || 0), 0)
    const totalEstimatedBS = Array.from(selectedIds).reduce((sum, id) => sum + (edits[id]?.priceBs || 0), 0)

    if (loading) return <div className="p-8 text-center">Cargando lista inteligente...</div>

    return (
        <AppLayout>
            <div className="flex flex-col space-y-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <ShoppingCart className="w-8 h-8 text-blue-600" />
                            Lista de Compras Inteligente
                        </h2>
                        <p className="text-gray-500 text-sm mt-1">
                            Se genera automáticamente según lo que vendes.
                        </p>
                    </div>
                    {exchangeRate && (
                        <div className="bg-green-50 px-4 py-2 rounded-lg border border-green-200">
                            <span className="text-sm text-green-800 font-medium">BCV: {exchangeRate.toFixed(2)} Bs/$</span>
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                    <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                        <span className="font-medium text-gray-700">{items.length} Items pendientes</span>
                        {selectedIds.size > 0 && (
                            <span className="text-sm text-blue-600 font-bold">
                                Total a pagar: ${totalEstimatedUSD.toFixed(2)} / Bs {totalEstimatedBS.toFixed(2)}
                            </span>
                        )}
                    </div>

                    {items.length === 0 ? (
                        <div className="p-12 text-center text-gray-400">
                            <Check className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>¡Todo al día! No hay compras pendientes.</p>
                            <p className="text-sm">Vende productos para generar necesidades de stock.</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {items.map(item => (
                                <div key={item.id} className={`p-4 flex flex-col md:flex-row gap-4 items-center ${selectedIds.has(item.id) ? 'bg-blue-50/30' : ''}`}>

                                    {/* Checkbox & Name */}
                                    <div className="flex items-center gap-3 flex-1 w-full">
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            checked={selectedIds.has(item.id)}
                                            onChange={() => toggleSelection(item.id)}
                                        />
                                        <div>
                                            <p className="font-bold text-gray-900">{item.inventoryItem.name}</p>
                                            <p className="text-xs text-gray-500">Unidad: {item.inventoryItem.unit}</p>
                                        </div>
                                    </div>

                                    {/* Inputs (Quantity, USD, BS) */}
                                    <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
                                        <div className="flex flex-col w-24">
                                            <label className="text-[10px] text-gray-500 uppercase">Cantidad</label>
                                            <Input
                                                type="number"
                                                value={edits[item.id]?.quantity || ''}
                                                onChange={(e) => handleEditChange(item.id, 'quantity', e.target.value)}
                                                className="h-9 text-center font-medium"
                                            />
                                        </div>

                                        <div className="flex flex-col w-28">
                                            <label className="text-[10px] text-gray-500 uppercase">Total USD ($)</label>
                                            <Input
                                                type="number"
                                                value={edits[item.id]?.totalPrice?.toFixed(2) || ''}
                                                onChange={(e) => handleEditChange(item.id, 'totalPrice', e.target.value)}
                                                className="h-9 text-right font-medium text-green-700"
                                            />
                                        </div>

                                        <div className="flex flex-col w-32">
                                            <label className="text-[10px] text-gray-500 uppercase">Total BS</label>
                                            <Input
                                                type="number"
                                                value={edits[item.id]?.priceBs?.toFixed(2) || ''}
                                                onChange={(e) => handleEditChange(item.id, 'priceBs', e.target.value)}
                                                className="h-9 text-right font-medium text-blue-700"
                                            />
                                        </div>

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleRemove(item.id)}
                                            className="mt-4 text-gray-400 hover:text-red-500"
                                            title="Eliminar de la lista"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {items.length > 0 && (
                    <div className="sticky bottom-4 bg-white p-4 rounded-lg shadow-lg border border-gray-200 flex justify-between items-center z-10">
                        <Input
                            placeholder="Proveedor (Opcional)"
                            value={supplier}
                            onChange={e => setSupplier(e.target.value)}
                            className="w-full md:w-64 mr-4"
                        />
                        <Button
                            onClick={handleConfirmPurchase}
                            disabled={isConfirming || selectedIds.size === 0}
                            className="bg-green-600 hover:bg-green-700 text-white shadow-md transition-all"
                        >
                            {isConfirming ? "Procesando..." : `Confirmar Compra (${selectedIds.size})`}
                        </Button>
                    </div>
                )}
            </div>
        </AppLayout>
    )
}
