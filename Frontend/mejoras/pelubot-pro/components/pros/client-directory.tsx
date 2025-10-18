import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const clients = [
  {
    initials: "LP",
    name: "Laura Pérez",
    status: "ACTIVO",
    tags: ["VIP", "Color"],
    lastVisit: "12 sept 2025",
    daysAgo: "hace 32 días",
    nextVisit: "19 oct 2025 · dentro de 5 días",
    visits: 18,
    revenue: "845 €",
    favorites: "Coloración, Tratamiento hidratante",
    phone: "+34 612 345 678",
    email: "laura@example.com",
  },
  {
    initials: "ML",
    name: "Marta López",
    status: "ACTIVO",
    tags: ["Eventos"],
    lastVisit: "28 ago 2025",
    daysAgo: "hace 47 días",
    nextVisit: "Sin cita programada",
    visits: 6,
    revenue: "210 €",
    favorites: "Peinado evento",
    phone: "+34 698 221 430",
    email: "",
  },
  {
    initials: "AV",
    name: "Andrea Vidal",
    status: "NUEVO",
    tags: [],
    lastVisit: "01 sept 2025",
    daysAgo: "hace 43 días",
    nextVisit: "Sin cita programada",
    visits: 9,
    revenue: "362 €",
    favorites: "Tratamiento hidratante",
    phone: "",
    email: "",
  },
]

export function ClientDirectory() {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold mb-1">Directorio de clientes</h2>
          <p className="text-sm text-muted-foreground">
            Explora el histórico, contacto y próximos pasos. Pronto podrás filtrar y editar cada ficha.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            Actualizar
          </Button>
          <Button variant="outline" size="sm">
            Importar clientes (pronto)
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {clients.map((client) => (
          <div key={client.name} className="p-4 rounded-lg border border-border bg-secondary/20">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center font-semibold text-primary">
                {client.initials}
              </div>

              <div className="flex-1 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{client.name}</h3>
                      <Badge variant="outline" className="text-xs">
                        {client.status}
                      </Badge>
                      {client.tags.map((tag) => (
                        <Badge key={tag} className="text-xs bg-primary/20 text-primary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    Abrir ficha (pronto)
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">Última visita</p>
                    <p className="font-medium">{client.lastVisit}</p>
                    <p className="text-xs text-muted-foreground">{client.daysAgo}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Próxima visita</p>
                    <p className="font-medium">{client.nextVisit}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">Histórico</p>
                    <p className="font-medium">{client.visits} visitas</p>
                    <p className="text-xs text-muted-foreground">{client.revenue} acumulados</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground mb-1">Favoritos</p>
                    <p className="font-medium">{client.favorites}</p>
                  </div>
                </div>

                {(client.phone || client.email) && (
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    {client.phone && <span>{client.phone}</span>}
                    {client.email && <span>{client.email}</span>}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm">
                    Contacto
                  </Button>
                  <Button variant="outline" size="sm">
                    Acciones
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
