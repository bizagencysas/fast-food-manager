"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, ShoppingCart, Package, DollarSign, PieChart, Menu, X, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { handleSignOut } from "@/app/actions/auth"

const NAV_ITEMS = [
    { label: "Inicio", href: "/", icon: LayoutDashboard },
    { label: "Ventas", href: "/sales", icon: ShoppingCart },
    { label: "Inventario", href: "/inventory", icon: Package },
    { label: "Finanzas", href: "/finance", icon: DollarSign },
    { label: "Reportes", href: "/reports", icon: PieChart },
]

export function MobileNav() {
    const pathname = usePathname()

    return (
        <div className="fixed bottom-0 left-0 right-0 border-t bg-white md:hidden z-50 pb-safe">
            <div className="flex justify-around items-center h-16">
                {NAV_ITEMS.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname.startsWith(item.href)

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center w-full h-full space-y-1",
                                isActive ? "text-blue-600" : "text-gray-500 hover:text-gray-900"
                            )}
                        >
                            <Icon className="w-6 h-6" />
                            <span className="text-[10px] font-medium">{item.label}</span>
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}

export function Sidebar() {
    const pathname = usePathname()

    return (
        <div className="hidden md:flex flex-col w-64 border-r bg-white h-screen sticky top-0">
            <div className="p-6 border-b">
                <h1 className="text-xl font-bold text-blue-600">FastFood Mgr</h1>
            </div>
            <nav className="flex-1 p-4 space-y-2">
                {NAV_ITEMS.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname.startsWith(item.href)

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center space-x-3 px-3 py-2 rounded-md transition-colors",
                                isActive
                                    ? "bg-blue-50 text-blue-600"
                                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                            )}
                        >
                            <Icon className="w-5 h-5" />
                            <span className="font-medium">{item.label}</span>
                        </Link>
                    )
                })}
            </nav>
            <div className="p-4 border-t">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200" />
                        <div>
                            <p className="text-sm font-medium">Usuario</p>
                            <p className="text-xs text-gray-500">Operador</p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSignOut()}
                        className="text-gray-500 hover:text-red-600"
                        title="Cerrar Sesión"
                    >
                        <LogOut className="w-5 h-5" />
                    </Button>
                </div>
            </div>
        </div>
    )
}

export function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar />
            <main className="flex-1 pb-20 md:pb-0">
                <div className="max-w-4xl mx-auto p-4 md:p-8">
                    {children}
                </div>
            </main>
            <MobileNav />
        </div>
    )
}
