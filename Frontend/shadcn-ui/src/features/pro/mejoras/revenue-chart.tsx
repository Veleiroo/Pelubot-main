import { Card } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { TrendingUp } from 'lucide-react';
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';

const data = [
  { month: 'May', ingresos: 4318, reservas: 65 },
  { month: 'Jun', ingresos: 3800, reservas: 58 },
  { month: 'Jul', ingresos: 3200, reservas: 52 },
  { month: 'Ago', ingresos: 2800, reservas: 48 },
  { month: 'Sept', ingresos: 2400, reservas: 42 },
  { month: 'Oct', ingresos: 4318, reservas: 40 },
] as const;

export const RevenueChart = () => (
  <Card className="border border-border/50 bg-card p-6 shadow-lg">
    <div className="mb-2 flex items-center gap-2">
      <TrendingUp className="h-5 w-5 text-foreground" />
      <h2 className="text-lg font-semibold text-foreground">RENDIMIENTO ÚLTIMO SEMESTRE</h2>
    </div>

    <p className="mb-2 text-3xl font-bold text-foreground">4318,00 €</p>
    <p className="mb-6 text-sm text-muted-foreground">
      Ingresos estimados por mes. Usa esta tendencia para planificar campañas y gestionar tu capacidad.
    </p>

    <ChartContainer
      config={{
        ingresos: {
          label: 'Ingresos estimados',
          color: 'hsl(var(--primary))',
        },
        reservas: {
          label: 'Reservas del mes',
          color: 'hsl(var(--chart-2))',
        },
      }}
      className="h-[300px]"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))' }} className="text-xs" />
          <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} className="text-xs" />
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

    <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-6">
      <div>
        <p className="mb-1 text-sm text-muted-foreground">Ingresos estimados</p>
        <p className="text-2xl font-bold text-foreground">4318,00 €</p>
      </div>
      <div>
        <p className="mb-1 text-sm text-muted-foreground">Reservas del mes</p>
        <p className="text-2xl font-bold text-foreground">40</p>
      </div>
    </div>
  </Card>
);

export default RevenueChart;
