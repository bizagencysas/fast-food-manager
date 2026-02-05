"use client"

import { useState } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Plus, Minus, Trash2, ShoppingCart, Loader2 } from "lucide-react"
import { createSale } from "./actions"

// Types
type Product = {
    id: string
    name: string
    price: number
    category: string
}

type CartItem = Product & {
    quantity: number
}

interface SalesInterfaceProps {
    initialProducts: Product[]
}

export default function SalesInterface({ initialProducts }: SalesInterfaceProps) {
    const [cart, setCart] = useState<CartItem[]>([])
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showPaymentModal, setShowPaymentModal] = useState(false)

    const [isCustomModalOpen, setIsCustomModalOpen] = useState(false)
    const [customItemName, setCustomItemName] = useState("")
    const [customItemPrice, setCustomItemPrice] = useState("")

    const filteredProducts = initialProducts.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesCategory = selectedCategory ? product.category === selectedCategory : true
        return matchesSearch && matchesCategory
    })

    // Get unique categories
    const categories = Array.from(new Set(initialProducts.map(p => p.category)))

    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id)
            if (existing) {
                return prev.map(item =>
                    item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                )
            }
            return [...prev, { ...product, quantity: 1 }]
        })
    }

    const handleAddCustomItem = () => {
        if (!customItemName || !customItemPrice) return

        const price = parseFloat(customItemPrice)
        if (isNaN(price)) return

        const customProduct: Product = {
            id: `custom-${Date.now()}`,
            name: customItemName,
            price: price,
            category: 'OTRO'
        }

        addToCart(customProduct)
        setCustomItemName("")
        setCustomItemPrice("")
        setIsCustomModalOpen(false)
    }

    const updateQuantity = (productId: string, delta: number) => {
        setCart(prev => {
            return prev.map(item => {
                if (item.id === productId) {
                    const newQuantity = Math.max(0, item.quantity + delta)
                    return { ...item, quantity: newQuantity }
                }
                return item
            }).filter(item => item.quantity > 0)
        })
    }

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)

    const handleCheckoutClick = () => {
        setShowPaymentModal(true)
    }

    const processSale = async (method: "CASH" | "TRANSFER" | "MOBILE_PAYMENT") => {
        setIsSubmitting(true)
        // setShowPaymentModal(false) // Keep open while processing

        // Mock User ID or Fixed ID
        const userId = "admin-id" // Matching the 'freddy' logic 

        const result = await createSale({
            userId,
            items: cart.map(i => ({
                productId: i.id,
                quantity: i.quantity,
                unitPrice: i.price,
                name: i.name // Pass name for custom items
            })),
            total: total,
            paymentMethod: method,
        })

        setIsSubmitting(false)
        setShowPaymentModal(false)

        if (result.success) {
            alert("✅ Venta registrada exitosamente")
            setCart([])
        } else {
            alert(`❌ Error: ${result.error || "No se pudo registrar la venta"}`)
        }
    }

    return (
        <AppLayout>
            <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-140px)] md:h-[calc(100vh-100px)]">

                {/* Product List Section */}
                <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                    <div className="flex gap-2 sticky top-0 bg-gray-50 z-10 pb-2">
                        <Input
                            placeholder="Buscar producto..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="flex-1"
                        />
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                        {categories.map(cat => (
                            <Button
                                key={cat}
                                variant={selectedCategory === cat ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                                className="whitespace-nowrap"
                            >
                                {cat}
                            </Button>
                        ))}
                    </div>

                    <div className="grid grid-cols-3 lg:grid-cols-3 gap-2 overflow-y-auto pb-48 md:pb-0">
                        {/* Always show Custom Item Button first */}
                        <Card
                            className="cursor-pointer border-dashed border-2 border-gray-300 hover:border-black transition-colors active:scale-95 bg-gray-50"
                            onClick={() => setIsCustomModalOpen(true)}
                        >
                            <CardContent className="p-2 flex flex-col items-center text-center gap-1 h-full justify-center">
                                <div className="h-8 w-8 bg-black rounded-full flex items-center justify-center text-white font-bold overflow-hidden text-xs">
                                    <Plus className="w-4 h-4" />
                                </div>
                                <h3 className="font-bold text-xs leading-tight">
                                    OTRO
                                </h3>
                                <div className="text-[10px] text-gray-500">
                                    Manual
                                </div>
                            </CardContent>
                        </Card>

                        {filteredProducts.map(product => (
                            <Card
                                key={product.id}
                                className="cursor-pointer hover:border-blue-500 transition-colors active:scale-95"
                                onClick={() => addToCart(product)}
                            >
                                <CardContent className="p-2 flex flex-col items-center text-center gap-1">
                                    <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold overflow-hidden text-xs">
                                        {product.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <h3 className="font-medium text-xs leading-tight h-8 flex items-center justify-center line-clamp-2">
                                        {product.name}
                                    </h3>
                                    <div className="font-bold text-sm text-blue-600">
                                        ${product.price.toFixed(2)}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Cart/Ticket Section */}
                <div className="w-full md:w-96 bg-white rounded-t-xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] border-t flex flex-col h-[30vh] md:h-full fixed md:relative bottom-16 md:bottom-0 left-0 right-0 z-40 md:z-0">
                    <div className="p-2 border-b bg-gray-50 rounded-t-xl flex justify-between items-center h-10">
                        <h2 className="font-bold flex items-center gap-2 text-sm text-black dark:text-white">
                            <ShoppingCart className="w-4 h-4" />
                            Factura ({cart.reduce((acc, i) => acc + i.quantity, 0)})
                        </h2>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setCart([])} disabled={cart.length === 0}>
                            <Trash2 className="w-3 h-3 text-red-500" />
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {cart.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-1">
                                <ShoppingCart className="w-8 h-8 opacity-20" />
                                <p className="text-xs text-black font-medium">Carrito Vacío</p>
                            </div>
                        ) : (
                            cart.map(item => (
                                <div key={item.id} className="flex justify-between items-center text-xs text-black font-medium">
                                    <div className="flex-1 truncate pr-2">
                                        <p className="truncate font-bold text-black">{item.name}</p>
                                        <p className="text-black font-semibold text-[10px]">${item.price.toFixed(2)} x {item.quantity}</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button variant="outline" size="icon" className="h-6 w-6 border-black text-black" onClick={() => updateQuantity(item.id, -1)}>
                                            <Minus className="w-3 h-3" />
                                        </Button>
                                        <span className="w-4 text-center font-bold text-black">{item.quantity}</span>
                                        <Button variant="outline" size="icon" className="h-6 w-6 border-black text-black" onClick={() => updateQuantity(item.id, 1)}>
                                            <Plus className="w-3 h-3" />
                                        </Button>
                                    </div>
                                    <div className="w-14 text-right font-bold text-black">
                                        ${(item.price * item.quantity).toFixed(2)}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-2 border-t bg-gray-50 space-y-2">
                        <div className="flex justify-between items-center text-sm font-bold text-black">
                            <span>Total</span>
                            <span>${total.toFixed(2)}</span>
                        </div>
                        <Button
                            className="w-full h-10 text-base bg-black text-white hover:bg-gray-800 shadow-md font-bold"
                            disabled={cart.length === 0 || isSubmitting}
                            onClick={handleCheckoutClick}
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cobrar"}
                        </Button>
                    </div>
                </div>

                {/* Custom Item Modal */}
                {isCustomModalOpen && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in duration-200 space-y-4">
                            <h3 className="text-xl font-bold text-center mb-0">Agregar Item Personalizado</h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-sm font-medium">Descripción</label>
                                    <Input
                                        value={customItemName}
                                        onChange={e => setCustomItemName(e.target.value)}
                                        placeholder="Ej: Perro Mixto"
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Precio ($)</label>
                                    <Input
                                        type="number"
                                        value={customItemPrice}
                                        onChange={e => setCustomItemPrice(e.target.value)}
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <Button variant="outline" className="flex-1" onClick={() => setIsCustomModalOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button className="flex-1 bg-black text-white" onClick={handleAddCustomItem}>
                                    Agregar
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Payment Modal */}
                {showPaymentModal && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in duration-200 space-y-4">
                            <h3 className="text-xl font-bold text-center mb-4 text-black">Seleccione Método de Pago</h3>
                            <div className="grid grid-cols-1 gap-3">
                                <Button size="lg" className="w-full bg-black text-white hover:bg-gray-800 text-lg py-6 shadow-md border border-gray-800" onClick={() => processSale("CASH")}>
                                    Efectivo 💵
                                </Button>
                                <Button size="lg" className="w-full bg-black text-white hover:bg-gray-800 text-lg py-6 shadow-md border border-gray-800" onClick={() => processSale("TRANSFER")}>
                                    Transferencia 🏦
                                </Button>
                                <Button size="lg" className="w-full bg-black text-white hover:bg-gray-800 text-lg py-6 shadow-md border border-gray-800" onClick={() => processSale("MOBILE_PAYMENT")}>
                                    Pago Móvil 📱
                                </Button>
                            </div>
                            <Button variant="outline" className="w-full mt-4 text-black border-black hover:bg-gray-100 font-bold" onClick={() => setShowPaymentModal(false)}>
                                Cancelar
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    )
}
