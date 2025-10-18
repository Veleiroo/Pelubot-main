import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const clients = [
  {
    initials: 'LP',
    name: 'Laura Pérez',
    status: 'ACTIVO',
    tags: ['VIP', 'Color'],
    lastVisit: '12 sept 2025',
    daysAgo: 'hace 32 días',
    nextVisit: '19 oct 2025 · dentro de 5 días',
    visits: 18,
    revenue: '845 €',
    favorites: 'Coloración, Tratamiento hidratante',
    phone: '+34 612 345 678',
    email: 'laura@example.com',
  },
  {
    initials: 'ML',
    name: 'Marta López',
    status: 'ACTIVO',
    tags: ['Eventos'],
    lastVisit: '28 ago 2025',
    daysAgo: 'hace 47 días',
    nextVisit: 'Sin cita programada',
    visits: 6,
    revenue: '210 €',
    favorites: 'Peinado evento',
    phone: '+34 698 221 430',
    email: '',
  },
  {
    initials: 'AV',
    name: 'Andrea Vidal',
    status: 'NUEVO',
    tags: [],
    lastVisit: '01 sept 2025',
    daysAgo: 'hace 43 días',
    nextVisit: 'Sin cita programada',
    visits: 9,
    revenue: '362 €',
    favorites: 'Tratamiento hidratante',
    phone: '',
    email: '',
  },
] as const;

export const ClientDirectory = () => (
  <Card className="border border-border/50 bg-card p-6 shadow-lg">
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h2 className="mb-1 text-xl font-bold text-foreground">Directorio de clientes</h2>
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
        <div key={client.name} className="rounded-lg border border-border bg-secondary/20 p-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
              {client.initials}
            </div>

            <div className="flex-1 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{client.name}</h3>
                    <Badge variant="outline" className="text-xs uppercase">
                      {client.status}
                    </Badge>
                    {client.tags.map((tag) => (
                      <Badge key={tag} className="text-xs uppercase text-primary" variant="default">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  Abrir ficha (pronto)
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div>
                  <p className="mb-1 text-xs uppercase tracking-wider">Última visita</p>
                  <p className="font-medium text-foreground">{client.lastVisit}</p>
                  <p className="text-xs text-muted-foreground">{client.daysAgo}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs uppercase tracking-wider">Próxima visita</p>
                  <p className="font-medium text-foreground">{client.nextVisit}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
                <div>
                  <p className="mb-1 text-xs uppercase tracking-wider">Histórico</p>
                  <p className="font-medium text-foreground">{client.visits} visitas</p>
                  <p className="text-xs text-muted-foreground">{client.revenue} acumulados</p>
                </div>
                <div className="col-span-2">
                  <p className="mb-1 text-xs uppercase tracking-wider">Favoritos</p>
                  <p className="font-medium text-foreground">{client.favorites}</p>
                </div>
              </div>

              {(client.phone || client.email) && (
                <div className="flex gap-4 text-sm text-muted-foreground">
                  {client.phone ? <span>{client.phone}</span> : null}
                  {client.email ? <span>{client.email}</span> : null}
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
);

export default ClientDirectory;
