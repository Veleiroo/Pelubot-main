import { Info } from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

import { CLIENT_STATUS_BADGE, CLIENT_STATUS_LABELS } from '../constants';
import { formatEuro } from '../lib/format';
import type { ClientRow } from '../types';

type ClientTableProps = {
  clients: ClientRow[];
  isLoading: boolean;
  errorMessage: string | null;
  onImportClick: () => void;
  onRefreshClick: () => void;
};

export const ClientsTable = ({ clients, isLoading, errorMessage, onImportClick, onRefreshClick }: ClientTableProps) => {
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          Cargando directorio...
        </div>
      );
    }

    if (errorMessage) {
      return (
        <div className="flex h-64 flex-col items-center justify-center gap-2 px-6 text-center text-sm text-destructive">
          <Info className="h-5 w-5" />
          <p>{errorMessage}</p>
        </div>
      );
    }

    if (clients.length === 0) {
      return (
        <div className="flex h-64 flex-col items-center justify-center gap-3 px-6 text-center text-sm text-muted-foreground">
          <p className="max-w-md">
            Aún no has registrado clientes. Cuando confirmes reservas desde la agenda, aparecerán aquí automáticamente.
          </p>
          <Button variant="outline" className="border-border/60" disabled>
            Crear cliente manualmente (en camino)
          </Button>
        </div>
      );
    }

    return (
      <ScrollArea className="max-h-[520px] pr-1">
        <div className="space-y-3 p-4">
          {clients.map((client) => (
            <div
              key={client.id}
              className="flex flex-col gap-4 rounded-2xl border border-border/50 bg-background/80 p-4 transition hover:border-border hover:bg-background"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12 border border-border/60 bg-muted/30">
                    <AvatarFallback className="text-sm font-medium text-foreground">{client.initials}</AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-semibold text-foreground">{client.name}</p>
                      <Badge
                        variant="secondary"
                        className={`border border-transparent text-xs uppercase tracking-wide ${CLIENT_STATUS_BADGE[client.status]}`}
                      >
                        {CLIENT_STATUS_LABELS[client.status]}
                      </Badge>
                      {client.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="border-border/50 text-[11px] text-muted-foreground">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="grid gap-4 text-sm text-muted-foreground md:grid-cols-2">
                      <div>
                        <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground/70">Última visita</p>
                        <p className="font-medium text-foreground">{client.lastVisitLabel}</p>
                        {client.lastVisitRelative ? (
                          <p className="text-xs text-muted-foreground/80">{client.lastVisitRelative}</p>
                        ) : null}
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground/70">Próxima visita</p>
                        <p className="font-medium text-foreground">
                          {client.upcomingLabel ?? 'Sin cita programada'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                  <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground/70">Histórico</p>
                  <span className="font-medium text-foreground">{client.totalVisits} visitas</span>
                  <span className="text-xs text-muted-foreground/80">{formatEuro(client.totalSpent)} acumulados</span>
                  {client.favoriteServices.length ? (
                    <span className="text-xs text-muted-foreground/80">
                      Favoritos: {client.favoriteServices.join(', ')}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3 text-sm text-muted-foreground">
                <div className="flex flex-wrap items-center gap-4">
                  {client.contact?.phone ? <span>{client.contact.phone}</span> : null}
                  {client.contact?.email ? <span>{client.contact.email}</span> : null}
                  {!client.contact?.phone && !client.contact?.email ? (
                    <span className="text-xs text-muted-foreground/70">Sin datos de contacto</span>
                  ) : null}
                </div>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" disabled>
                  Abrir ficha (pronto)
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    );
  };

  return (
    <Card className="flex flex-col overflow-hidden border border-border/60 bg-card/90 shadow-lg shadow-black/10">
      <div className="flex flex-col gap-3 border-b border-border/60 px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Directorio de clientes</h2>
          <p className="text-sm text-muted-foreground">
            Explora el histórico, contacto y próximos pasos. Pronto podrás filtrar y editar cada ficha.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onRefreshClick}>
            Actualizar
          </Button>
          <Button variant="outline" size="sm" onClick={onImportClick}>
            Importar clientes (pronto)
          </Button>
        </div>
      </div>
      {renderContent()}
    </Card>
  );
};
