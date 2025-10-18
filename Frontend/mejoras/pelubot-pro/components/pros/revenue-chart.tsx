"use client"

import { Card } from "@/components/ui/card"
import { TrendingUp } from "lucide-react"
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

const data = [
  { month: "May", ingresos: 4318, reservas: 65 },
  { month: "Jun", ingresos: 3800, reservas: 58 },
  { month: "Jul", ingresos: 3200, reservas: 52 },
  { month: "Ago", ingresos: 2800, reservas: 48 },
  { month: "Sept", ingresos: 2400, reservas: 42 },
  { month: "Oct", ingresos: 4318, reservas: 40 },
]

export function RevenueChart() {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp className="w-5 h-5" />
        <h2 className="text-lg font-semibold">RENDIMIENTO ÚLTIMO SEMESTRE</h2>
      </div>

      <p className="text-3xl font-bold mb-2">4318,00 €</p>
      <p className="text-sm text-muted-foreground mb-6">
        Ingresos estimados por mes. Usa esta tendencia para planificar campañas y gestionar tu capacidad.
      </p>

      <ChartContainer
        config={{
          ingresos: {
            label: "Ingresos estimados",
            color: "hsl(var(--primary))",
          },
          reservas: {
            label: "Reservas del mes",
            color: "hsl(var(--chart-2))",
          },
        }}
        className="h-[300px]"
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="month" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
            <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line type="monotone" dataKey="ingresos" stroke="hsl(var(--primary))" strokeWidth={3} dot={false} />
            <Line
              type="monotone"
              dataKey="reservas"
              stroke="hsl(var(--chart-2))"
              strokeWidth={3}
              strokeDasharray="5 5"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>

      <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-border">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Ingresos estimados</p>
          <p className="text-2xl font-bold">4318,00 €</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground mb-1">Reservas del mes</p>
          <p className="text-2xl font-bold">40</p>
        </div>
      </div>
    </Card>
  )
}
