import { Card } from "@/components/ui/card"

const stats = [
  {
    label: "Clientes totales",
    value: "5",
    description: "2 con visitas recientes",
  },
  {
    label: "Clientes recurrentes",
    value: "2",
    description: "Última visita dentro de 90 días",
  },
  {
    label: "Clientes nuevos",
    value: "1",
    description: "Registrados el último trimestre",
  },
  {
    label: "Clientes a recuperar",
    value: "2",
    description: "1 en seguimiento · 1 inactivos",
  },
]

export function ClientStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">{stat.label}</h3>
          <p className="text-4xl font-bold mb-2">{stat.value}</p>
          <p className="text-xs text-muted-foreground">{stat.description}</p>
        </Card>
      ))}
    </div>
  )
}
