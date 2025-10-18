import { Card } from "@/components/ui/card"

export function DailySummary() {
  const stats = [
    { label: "Confirmadas", value: 2, color: "bg-accent" },
    { label: "Pendientes", value: 1, color: "bg-yellow-500" },
    { label: "Canceladas", value: 1, color: "bg-destructive" },
  ]

  return (
    <Card className="p-5 bg-card border-border/50 shadow-lg">
      <h3 className="text-lg font-semibold mb-1">Resumen del día</h3>
      <p className="text-xs text-muted-foreground mb-4">Vista rápida de tu agenda hoy.</p>

      <div className="space-y-4">
        <div className="text-center py-4 border-b border-border">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total de citas</p>
          <p className="text-4xl font-bold">4</p>
        </div>

        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center justify-between py-2">
            <span className="text-sm text-muted-foreground">{stat.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold">{stat.value}</span>
              <div className={cn("w-2 h-2 rounded-full", stat.color)} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ")
}
