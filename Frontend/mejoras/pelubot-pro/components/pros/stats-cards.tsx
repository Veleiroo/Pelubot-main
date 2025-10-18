import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, HelpCircle } from "lucide-react"

const stats = [
  {
    label: "INGRESOS DEL MES",
    value: "4318,00 €",
    change: "+12.5 %",
    comparison: "vs. mes anterior",
    trend: "up",
    color: "bg-emerald-500/10",
  },
  {
    label: "TICKET MEDIO",
    value: "68,40 €",
    change: "+4.2 %",
    comparison: "vs. mes anterior",
    trend: "up",
    color: "bg-blue-500/10",
  },
  {
    label: "REPETICIÓN DE CLIENTAS",
    value: "62.0%",
    change: "+3.5 %",
    comparison: "vs. mes anterior",
    trend: "up",
    color: "bg-amber-500/10",
  },
  {
    label: "NUEVAS CLIENTAS",
    value: "14",
    change: "-8.4 %",
    comparison: "vs. mes anterior",
    trend: "down",
    color: "bg-rose-500/10",
  },
]

export function StatsCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} className={cn("p-6 relative overflow-hidden", stat.color)}>
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</h3>
            <HelpCircle className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-3xl font-bold mb-3">{stat.value}</p>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn("flex items-center gap-1", stat.trend === "up" ? "text-primary" : "text-destructive")}
            >
              {stat.trend === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {stat.change}
            </Badge>
            <span className="text-xs text-muted-foreground">{stat.comparison}</span>
          </div>
        </Card>
      ))}
    </div>
  )
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ")
}
