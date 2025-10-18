"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Calendar, LogOut, Scissors } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/pros/resumen", label: "Resumen" },
  { href: "/pros/agenda", label: "Agenda" },
  { href: "/pros/clientes", label: "Clientes" },
  { href: "/pros/estadisticas", label: "Estadísticas" },
]

export function ProHeader() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = () => {
    router.push("/login")
  }

  return (
    <header className="border-b border-border/50 bg-background sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo - stays on the left */}
          <Link href="/pros/resumen" className="flex items-center gap-2">
            <Scissors className="w-5 h-5 text-foreground" />
            <span className="font-bold text-lg">PELUBOT PRO</span>
            <span className="text-sm text-muted-foreground">• MARINA</span>
          </Link>

          {/* Navigation - centered */}
          <nav className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Actions - right side */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="bg-transparent hover:bg-secondary">
              <Calendar className="w-4 h-4 mr-2" />
              Nueva cita
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="hover:bg-secondary">
              <LogOut className="w-4 h-4 mr-2" />
              Salir
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
