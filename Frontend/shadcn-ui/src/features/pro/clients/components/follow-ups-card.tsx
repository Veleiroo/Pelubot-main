import { BellRing } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import { CLIENT_STATUS_BADGE, CLIENT_STATUS_LABELS } from '../constants';
import type { ClientRow } from '../types';

type FollowUpsCardProps = {
  followUps: ClientRow[];
  isLoading: boolean;
};

export const FollowUpsCard = ({ followUps, isLoading }: FollowUpsCardProps) => (
  <Card className="space-y-4 rounded-2xl border border-border/60 bg-card/90 p-5 shadow-lg shadow-black/10">
    <header>
      <div className="flex items-center gap-2">
        <BellRing className="h-5 w-5 text-amber-500" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-foreground">Seguimiento recomendado</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Contactos que llevan más tiempo sin visitar el salón. Podrás automatizar recordatorios muy pronto.
      </p>
    </header>
    {isLoading ? (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full rounded-xl bg-muted/40" />
        <Skeleton className="h-16 w-full rounded-xl bg-muted/40" />
        <Skeleton className="h-16 w-full rounded-xl bg-muted/40" />
      </div>
    ) : followUps.length === 0 ? (
      <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
        No hay clientes críticos en este momento. ¡Buen trabajo manteniendo las visitas recientes!
      </div>
    ) : (
      <ul className="space-y-3">
        {followUps.map((client) => (
          <li
            key={client.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/80 px-4 py-3"
          >
            <div className="flex flex-col text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{client.name}</span>
              <span className="text-xs text-muted-foreground/80">Última visita: {client.lastVisitLabel}</span>
              {client.lastVisitRelative ? (
                <span className="text-xs text-muted-foreground/70">{client.lastVisitRelative}</span>
              ) : null}
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge
                variant="secondary"
                className={`border border-transparent text-xs uppercase tracking-wide ${CLIENT_STATUS_BADGE[client.status]}`}
              >
                {CLIENT_STATUS_LABELS[client.status]}
              </Badge>
              <Button variant="outline" size="sm" disabled>
                Enviar recordatorio (pronto)
              </Button>
            </div>
          </li>
        ))}
      </ul>
    )}
  </Card>
);

export default FollowUpsCard;
