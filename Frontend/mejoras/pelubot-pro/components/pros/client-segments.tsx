import { Card } from "@/components/ui/card"
import { TrendingUp, Users, AlertCircle } from "lucide-react"

const segments = [
  {
    icon: TrendingUp,
    label: "VIP",
    description: "Ticket medio superior a 60€ y visitas frecuentes.",
    count: 1,
    color: "text-primary",
  },
  {
    icon: Users,
    label: "EVENTOS",
    description: "Visitan principalmente para peinados y recogidos especiales.",
    count: 1,
    color: "text-yellow-500",
  },
  {
    icon: AlertCircle,
    label: "RECUPERAR",
    description: "Más de 90 días sin visita. Acciones de reactivación sugeridas.",
    count: 2,
    color: "text-destructive",
  },
]

export function ClientSegments() {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-2">
        <Users className="w-5 h-5" />
        <h2 className="text-lg font-semibold">Segmentos destacados</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Agrupaciones automáticas según hábitos y valor histórico. Añadiremos filtros y acciones pronto.
      </p>

      <div className="space-y-4">
        {segments.map((segment) => (
          <div key={segment.label} className="p-4 rounded-lg bg-secondary/30 border border-border">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <segment.icon className={cn("w-5 h-5", segment.color)} />
                <h3 className="font-semibold">{segment.label}</h3>
              </div>
              <span className="text-2xl font-bold">{segment.count}</span>
            </div>
            <p className="text-sm text-muted-foreground">{segment.description}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ")
}
