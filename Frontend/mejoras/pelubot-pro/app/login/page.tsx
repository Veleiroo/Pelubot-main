"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Scissors } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    // Simple login - accepts any credentials for testing
    if (username && password) {
      router.push("/pros/resumen")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-900/20 via-background to-blue-900/20">
      <div className="w-full max-w-md px-6">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10">
            <Scissors className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold tracking-wider">PELUBOT PRO</span>
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-3 text-balance">Inicia sesión</h1>
          <p className="text-muted-foreground text-pretty leading-relaxed">
            Accede a tu panel profesional para confirmar citas, reorganizar tu agenda y mantener la comunicación con tus
            clientes al día.
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-center mb-6">Credenciales</h2>
              <p className="text-sm text-muted-foreground text-center mb-6">Introduce tus datos para continuar.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Usuario o email</Label>
              <Input
                id="username"
                type="text"
                placeholder="ej. admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-background"
              />
            </div>

            <Button type="submit" className="w-full" size="lg">
              Iniciar sesión
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          ¿Necesitas ayuda?{" "}
          <a href="mailto:soporte@pelubot.com" className="text-primary hover:underline">
            soporte@pelubot.com
          </a>
        </p>
      </div>
    </div>
  )
}
