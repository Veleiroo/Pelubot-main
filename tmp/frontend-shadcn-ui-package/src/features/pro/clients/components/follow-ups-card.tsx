import { BellRing } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { CLIENT_STATUS_BADGE, CLIENT_STATUS_LABELS } from '../constants';
import type { ClientRow } from '../types';

type FollowUpsCardProps = {
  followUps: ClientRow[];
  isLoading: boolean;
};

export const FollowUpsCard = ({ followUps, isLoading }: FollowUpsCardProps) => (
  <Card className="rounded-2xl border border-white/10 bg-white/[0.05] shadow-sm backdrop-blur">
    <CardHeader className="space-y-2">
      <CardTitle className="flex items-center gap-2 text-lg font-semibold text-white">
        <BellRing className="h-5 w-5 text-amber-300" />
        Seguimiento recomendado
      </CardTitle>
      <CardDescription className="text-sm text-white/60">
        Contactos que llevan más tiempo sin visitar el salón. Podrás automatizar recordatorios muy pronto.
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-3">
      {isLoading ? (
        <div className="space-y-3">
          <div className="h-14 rounded-xl border border-white/10 bg-white/10" />
          <div className="h-14 rounded-xl border border-white/10 bg-white/10" />
          <div className="h-14 rounded-xl border border-white/10 bg-white/10" />
        </div>
      ) : followUps.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-white/70">
          No hay clientes críticos en este momento. ¡Buen trabajo manteniendo las visitas recientes! 💫
        </div>
      ) : (
        <ul className="space-y-3">
          {followUps.map((client) => (
            <li key={client.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="flex flex-col text-sm text-white/80">
                <span className="font-semibold text-white">{client.name}</span>
                <span className="text-xs text-white/50">Última visita: {client.lastVisitLabel}</span>
                {client.lastVisitRelative ? (
                  <span className="text-xs text-white/40">{client.lastVisitRelative}</span>
                ) : null}
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge variant="secondary" className={`border border-transparent text-xs uppercase tracking-wide ${CLIENT_STATUS_BADGE[client.status]}`}>
                  {CLIENT_STATUS_LABELS[client.status]}
                </Badge>
                <Button size="sm" variant="outline" className="border-white/20 text-white hover:bg-white/10" disabled>
                  Enviar recordatorio (pronto)
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </CardContent>
  </Card>
);
