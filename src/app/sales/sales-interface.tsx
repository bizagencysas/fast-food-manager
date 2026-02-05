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
                unitPrice: i.price
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
                                <p className="text-xs">Vacío</p>
                            </div>
                        ) : (
                            cart.map(item => (
                                <div key={item.id} className="flex justify-between items-center text-xs">
                                    <div className="flex-1 truncate pr-2">
                                        <p className="font-medium truncate">{item.name}</p>
                                        <p className="text-gray-500 text-[10px]">${item.price.toFixed(2)} x {item.quantity}</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.id, -1)}>
                                            <Minus className="w-3 h-3" />
                                        </Button>
                                        <span className="w-4 text-center font-medium">{item.quantity}</span>
                                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.id, 1)}>
                                            <Plus className="w-3 h-3" />
                                        </Button>
                                    </div>
                                    <div className="w-14 text-right font-medium">
                                        ${(item.price * item.quantity).toFixed(2)}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-2 border-t bg-gray-50 space-y-2">
                        <div className="flex justify-between items-center text-sm font-bold">
                            <span>Total</span>
                            <span>${total.toFixed(2)}</span>
                        </div>
                        <Button
                            className="w-full h-10 text-base"
                            disabled={cart.length === 0 || isSubmitting}
                            onClick={handleCheckoutClick}
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cobrar"}
                        </Button>
                    </div>
                </div>

                {/* Payment Modal */}
                {showPaymentModal && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in duration-200 space-y-4">
                            <h3 className="text-xl font-bold text-center mb-4">Seleccione Método de Pago</h3>
                            <div className="grid grid-cols-1 gap-3">
                                <Button size="lg" className="w-full bg-green-600 hover:bg-green-700 text-lg py-6" onClick={() => processSale("CASH")}>
                                    Efectivo
                                </Button>
                                <Button size="lg" className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6" onClick={() => processSale("TRANSFER")}>
                                    Transferencia
                                </Button>
                                <Button size="lg" className="w-full bg-purple-600 hover:bg-purple-700 text-lg py-6" onClick={() => processSale("MOBILE_PAYMENT")}>
                                    Pago Móvil
                                </Button>
                            </div>
                            <Button variant="outline" className="w-full mt-4" onClick={() => setShowPaymentModal(false)}>
                                Cancelar
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    )
}
