import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Bell } from "lucide-react"

const retentionGroups = [
  {
    label: "Activas (<30 días)",
    count: 42,
    percentage: "54.3%",
    status: "Mejora",
    statusColor: "bg-primary/20 text-primary",
  },
  {
    label: "En seguimiento (30-90 días)",
    count: 18,
    percentage: "23.1%",
    status: "Estable",
    statusColor: "bg-yellow-500/20 text-yellow-600",
  },
  {
    label: "Recuperar (>90 días)",
    count: 17,
    percentage: "22.6%",
    status: "En riesgo",
    statusColor: "bg-destructive/20 text-destructive",
  },
]

export function ClientRetention() {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-2">
        <Bell className="w-5 h-5" />
        <h2 className="text-lg font-semibold">Retención de clientas</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Revisa los grupos según su última visita y prioriza acciones de reactivación.
      </p>

      <div className="space-y-4">
        {retentionGroups.map((group) => (
          <div key={group.label} className="p-4 rounded-lg bg-secondary/30 border border-border">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h3 className="font-semibold text-sm mb-1">{group.label}</h3>
                <p className="text-xs text-muted-foreground mb-2">Clientas que visitaron el salón en el último mes.</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-2xl font-bold">{group.count}</span>
                <span className="text-sm text-muted-foreground ml-2">clientas · {group.percentage}</span>
              </div>
              <Badge className={group.statusColor}>{group.status}</Badge>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 rounded-lg bg-primary/10 border border-primary/30">
        <h3 className="font-semibold text-sm mb-2">Seguimiento recomendado</h3>
        <p className="text-xs text-muted-foreground">
          Contactos que llevan más tiempo sin visitar el salón. Podrás automatizar recordatorios muy pronto.
        </p>
      </div>
    </Card>
  )
}
