import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users } from "lucide-react"

const retentionData = [
  {
    label: "Activas (<30 días)",
    count: 42,
    percentage: "54.3%",
    status: "Mejora",
    statusColor: "bg-primary/20 text-primary",
    description: "Clientas que visitaron el salón en el último mes.",
  },
  {
    label: "En seguimiento (30-90 días)",
    count: 18,
    percentage: "23.1%",
    status: "Estable",
    statusColor: "bg-yellow-500/20 text-yellow-600",
    description: "Recomendada una campaña de recordatorio.",
  },
  {
    label: "Recuperar (>90 días)",
    count: 17,
    percentage: "22.6%",
    status: "En riesgo",
    statusColor: "bg-destructive/20 text-destructive",
    description: "Contacta con beneficios especiales para su retorno.",
  },
]

export function ClientRetentionStats() {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-2">
        <Users className="w-5 h-5" />
        <h2 className="text-lg font-semibold">Retención de clientas</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Revisa los grupos según su última visita y prioriza acciones de reactivación.
      </p>

      <div className="space-y-4">
        {retentionData.map((item) => (
          <div key={item.label} className="p-4 rounded-lg bg-secondary/30 border border-border">
            <div className="mb-3">
              <h3 className="font-semibold text-sm mb-1">{item.label}</h3>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-2xl font-bold">{item.count}</span>
                <span className="text-sm text-muted-foreground ml-2">clientas · {item.percentage}</span>
              </div>
              <Badge className={item.statusColor}>{item.status}</Badge>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
