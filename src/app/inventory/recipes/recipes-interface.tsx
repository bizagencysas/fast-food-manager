"use client"

import { useState } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, ChefHat, Plus, Save, Trash2 } from "lucide-react"
import { saveRecipe } from "./actions"

// Types
type Ingredient = {
    inventoryItemId: string
    name: string
    quantity: number
    unit: string
}

type ProductWithRecipe = {
    id: string
    name: string
    category: string
    recipe: {
        ingredients: {
            inventoryItem: { id: string, name: string, unit: string }
            quantity: number // Decimal coming as number from actions if mapped, but here raw from Prisma might be Decimal? 
            // Wait, server actions serialize. We need to be careful with Decimals.
            // Let's assume the action returns plain objects or we handle it.
            // Prisma Decimals serialize to string in JSON usually or need conversion.
            // We'll handle it in usage.
            inventoryItemId: string
        }[]
    } | null
}

type InventoryItem = {
    id: string
    name: string
    unit: string
}

interface RecipesPageProps {
    products: any[] // relaxed type to avoid decimal conflicts for now
    inventoryItems: InventoryItem[]
}

export default function RecipesInterface({ products, inventoryItems }: RecipesPageProps) {
    const [selectedProduct, setSelectedProduct] = useState<any | null>(null)
    const [searchTerm, setSearchTerm] = useState("")
    const [recipeIngredients, setRecipeIngredients] = useState<Ingredient[]>([])
    const [isSaving, setIsSaving] = useState(false)

    // Filter products
    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Handle selecting a product
    const handleSelectProduct = (product: any) => {
        setSelectedProduct(product)
        // Load existing recipe if any
        if (product.recipe) {
            setRecipeIngredients(product.recipe.ingredients.map((i: any) => ({
                inventoryItemId: i.inventoryItemId,
                name: i.inventoryItem.name,
                unit: i.inventoryItem.unit,
                quantity: Number(i.quantity)
            })))
        } else {
            setRecipeIngredients([])
        }
    }

    // Add ingredient row
    const addIngredient = () => {
        setRecipeIngredients([...recipeIngredients, { inventoryItemId: "", name: "", quantity: 0, unit: "" }])
    }

    // Update specific row
    const updateIngredient = (index: number, field: keyof Ingredient, value: any) => {
        const newIngredients = [...recipeIngredients]
        if (field === 'inventoryItemId') {
            const item = inventoryItems.find(i => i.id === value)
            if (item) {
                newIngredients[index].inventoryItemId = item.id
                newIngredients[index].name = item.name
                newIngredients[index].unit = item.unit
            }
        } else {
            (newIngredients[index] as any)[field] = value
        }
        setRecipeIngredients(newIngredients)
    }

    // Remove row
    const removeIngredient = (index: number) => {
        const newIngredients = recipeIngredients.filter((_, i) => i !== index)
        setRecipeIngredients(newIngredients)
    }

    // Save
    const handleSave = async () => {
        if (!selectedProduct) return
        setIsSaving(true)

        // Validation
        const validIngredients = recipeIngredients.filter(i => i.inventoryItemId && i.quantity > 0)

        const res = await saveRecipe(selectedProduct.id, validIngredients.map(i => ({
            inventoryItemId: i.inventoryItemId,
            quantity: Number(i.quantity)
        })))

        if (res.success) {
            alert("Receta guardada correctamente")
            // Ideally refresh props data? For now we just stay.
            // In a real app we'd use router.refresh() or updated optimistic UI.
            location.reload()
        } else {
            alert("Error: " + res.error)
        }
        setIsSaving(false)
    }

    return (
        <AppLayout>
            <div className="flex flex-col h-[calc(100vh-100px)]">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <ChefHat className="w-8 h-8 text-orange-500" />
                        Gestión de Recetas
                    </h2>
                </div>

                <div className="flex gap-6 flex-1 overflow-hidden">
                    {/* Left: Product List */}
                    <div className="w-1/3 flex flex-col gap-4 border-r pr-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Buscar producto..."
                                className="pl-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-2">
                            {filteredProducts.map(product => (
                                <div
                                    key={product.id}
                                    onClick={() => handleSelectProduct(product)}
                                    className={`p-3 rounded-lg cursor-pointer border transition-colors ${selectedProduct?.id === product.id
                                            ? 'bg-orange-50 border-orange-500 shadow-sm'
                                            : 'hover:bg-gray-50 border-gray-200'
                                        }`}
                                >
                                    <div className="font-medium">{product.name}</div>
                                    <div className="text-xs text-gray-500">
                                        {product.recipe ? '✅ Receta configurada' : '⚠️ Sin receta'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: Recipe Editor */}
                    <div className="flex-1 flex flex-col overflow-y-auto">
                        {selectedProduct ? (
                            <Card className="flex-1 border-0 shadow-none">
                                <CardHeader className="px-0 pt-0">
                                    <CardTitle>Receta para: <span className="text-orange-600">{selectedProduct.name}</span></CardTitle>
                                </CardHeader>
                                <CardContent className="px-0 space-y-4">
                                    <p className="text-sm text-gray-500">
                                        Define qué ingredientes y qué cantidad se consumen <b>por cada unidad vendida</b>.
                                    </p>

                                    <div className="space-y-2">
                                        {recipeIngredients.map((ing, idx) => (
                                            <div key={idx} className="flex gap-2 items-center">
                                                <select
                                                    className="flex-1 border rounded p-2 text-sm"
                                                    value={ing.inventoryItemId}
                                                    onChange={(e) => updateIngredient(idx, 'inventoryItemId', e.target.value)}
                                                >
                                                    <option value="">Seleccionar Insumo...</option>
                                                    {inventoryItems.map(item => (
                                                        <option key={item.id} value={item.id}>
                                                            {item.name} ({item.unit})
                                                        </option>
                                                    ))}
                                                </select>
                                                <Input
                                                    type="number"
                                                    step="0.0001"
                                                    placeholder="Cantidad"
                                                    className="w-32"
                                                    value={ing.quantity}
                                                    onChange={(e) => updateIngredient(idx, 'quantity', e.target.value)}
                                                />
                                                <span className="w-16 text-sm text-gray-500">{ing.unit || '-'}</span>
                                                <Button variant="ghost" size="icon" onClick={() => removeIngredient(idx)}>
                                                    <Trash2 className="w-4 h-4 text-red-500" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>

                                    <Button variant="outline" onClick={addIngredient} className="w-full border-dashed">
                                        <Plus className="w-4 h-4 mr-2" /> Agregar Ingrediente
                                    </Button>

                                    <div className="pt-6 border-t mt-4">
                                        <Button
                                            className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                                            onClick={handleSave}
                                            disabled={isSaving}
                                        >
                                            <Save className="w-4 h-4 mr-2" />
                                            {isSaving ? "Guardando..." : "Guardar Receta Configurada"}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                                <ChefHat className="w-16 h-16 mb-4 opacity-20" />
                                <p>Selecciona un producto de la izquierda</p>
                                <p>para configurar sus ingredientes.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    )
}
