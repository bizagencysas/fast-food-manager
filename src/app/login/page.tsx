"use client"

import { useState } from "react"
// import { signIn } from "@/auth" // Client side signin needs import from next-auth/react or server action wrapper
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useRouter } from "next/navigation"

export default function LoginPage() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const router = useRouter()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const result = await signIn("credentials", {
                email,
                password,
                redirect: false
            })

            if (result?.error) {
                setError("Credenciales incorrectas")
            } else {
                router.push('/')
                router.refresh()
            }
        } catch (err) {
            setError("Error al iniciar sesión")
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl text-center">FastFood Manager</CardTitle>
                    <CardDescription className="text-center">Ingresa tus credenciales</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <label>Usuario</label>
                            <Input
                                type="text"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="usuario"
                            />
                        </div>
                        <div className="space-y-2">
                            <label>Contraseña</label>
                            <Input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="******"
                            />
                        </div>
                        {error && <p className="text-red-500 text-sm">{error}</p>}
                        <Button type="submit" className="w-full bg-black text-white hover:bg-gray-800 transition-colors shadow-sm">
                            Entrar
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
