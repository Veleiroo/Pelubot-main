import { useMemo } from 'react';
import { Calendar, CalendarClock, CheckCircle2, Clock, Phone, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import { formatDate } from '../lib/format';
import type { AppointmentActionType, OverviewAppointmentEntry } from '../types';

type AppointmentCardProps = {
  appointment: OverviewAppointmentEntry | null | undefined;
  isLoading: boolean;
  onAction: (action: AppointmentActionType, appointmentId?: string, detail?: string) => void;
};

const STATUS_BADGE_CLASSES: Record<OverviewAppointmentEntry['status'], string> = {
  confirmada: 'bg-accent/20 border border-accent/30 text-accent',
  asistida: 'bg-emerald-100 border border-emerald-200 text-emerald-700',
  no_asistida: 'bg-red-100 border border-red-200 text-red-700',
  cancelada: 'bg-rose-100 border border-rose-200 text-rose-600',
};

const STATUS_DOT_CLASSES: Record<OverviewAppointmentEntry['status'], string> = {
  confirmada: 'bg-accent',
  asistida: 'bg-emerald-600',
  no_asistida: 'bg-red-500',
  cancelada: 'bg-destructive',
};

const STATUS_LABELS: Record<OverviewAppointmentEntry['status'], string> = {
  confirmada: 'Confirmada',
  asistida: 'Asistida',
  no_asistida: 'No asistida',
  cancelada: 'Cancelada',
};

export const AppointmentCard = ({ appointment, isLoading, onAction }: AppointmentCardProps) => {
  const lastVisitLabel = useMemo(() => {
    if (!appointment?.lastVisit) return null;
    return formatDate(appointment.lastVisit);
  }, [appointment]);

  const badgeClasses = appointment ? STATUS_BADGE_CLASSES[appointment.status] : '';

  return (
    <Card className="rounded-lg border border-border/50 bg-card p-4 shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl">
      <div className="mb-4">
        <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">Próxima cita</p>
        <h2 className="mb-2 text-2xl font-bold text-foreground">
          {isLoading ? <Skeleton className="h-6 w-1/2" /> : appointment?.client ?? 'Sin citas programadas'}
        </h2>
        {appointment ? (
          <>
            <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="font-semibold text-foreground">{appointment.time} h</span>
              <span>•</span>
              <div className={cn('flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium', badgeClasses)}>
                <div className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT_CLASSES[appointment.status])} />
                <span>{STATUS_LABELS[appointment.status]}</span>
              </div>
            </div>
            <p className="mb-3 text-sm text-muted-foreground">{appointment.service}</p>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              {appointment.phone ? (
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{appointment.phone}</span>
                </div>
              ) : null}
              {lastVisitLabel ? (
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Última visita: {lastVisitLabel}</span>
                </div>
              ) : null}
            </div>
            {appointment.notes ? (
              <p className="mt-3 border-l-2 border-border pl-2 text-xs italic text-muted-foreground">
                {appointment.notes}
              </p>
            ) : null}
          </>
        ) : isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-2/5" />
            </div>
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Aprovecha el día libre para organizar tu agenda o contactar con tus clientes recurrentes.
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          className="flex-1 h-8 gap-1.5 bg-accent text-accent-foreground transition hover:bg-accent/90 text-xs"
          disabled={!appointment}
          onClick={() => onAction('attended', appointment?.id)}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Asistida
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 h-8 text-xs transition hover:bg-secondary/80"
          disabled={!appointment}
          onClick={() => onAction('no-show', appointment?.id)}
        >
          <XCircle className="h-3.5 w-3.5" />
          No asistió
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs transition hover:bg-secondary/80"
          disabled={!appointment}
          onClick={() => onAction('reschedule', appointment?.id)}
        >
          <CalendarClock className="h-3.5 w-3.5" />
          Mover
        </Button>
      </div>
    </Card>
  );
};

export default AppointmentCard;
