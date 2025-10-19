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
  confirmada: 'border border-amber-500/40 bg-amber-500/10 text-amber-600',
  asistida: 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-600',
  no_asistida: 'border border-red-500/40 bg-red-500/10 text-red-600',
  cancelada: 'border border-rose-500/40 bg-rose-500/10 text-rose-600',
};

const STATUS_DOT_CLASSES: Record<OverviewAppointmentEntry['status'], string> = {
  confirmada: 'bg-amber-500',
  asistida: 'bg-emerald-500',
  no_asistida: 'bg-red-500',
  cancelada: 'bg-rose-500',
};

const STATUS_LABELS: Record<OverviewAppointmentEntry['status'], string> = {
  confirmada: 'Pendiente',
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
    <Card className="rounded-xl border border-border/50 bg-card p-6 shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl font-sans">
      <div className="mb-4">
        <p className="mb-2 text-xs uppercase tracking-[0.28em] text-muted-foreground">Próxima cita</p>
        <h2 className="mb-3 text-3xl font-semibold text-foreground">
          {isLoading ? <Skeleton className="h-8 w-1/2" /> : appointment?.client ?? 'Sin citas programadas'}
        </h2>
        {appointment ? (
          <>
            <div className="mb-3 flex items-center gap-2 text-base text-muted-foreground">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="font-semibold text-foreground">{appointment.time} h</span>
              <span>•</span>
              <div
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium shadow-sm backdrop-blur',
                  badgeClasses
                )}
              >
                <div className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT_CLASSES[appointment.status])} />
                <span>{STATUS_LABELS[appointment.status]}</span>
              </div>
            </div>
            <p className="mb-4 text-base text-muted-foreground">{appointment.service}</p>
            <div className="space-y-1.5 text-sm text-muted-foreground">
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
            <p className="mt-3 border-l-2 border-border pl-3 text-sm italic text-muted-foreground">
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

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          className="flex-1 h-9 gap-2 rounded-full px-4 text-sm font-semibold bg-accent text-accent-foreground transition hover:bg-accent/90"
          disabled={!appointment}
          onClick={() => onAction('attended', appointment?.id)}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Asistida
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 h-9 rounded-full px-4 text-sm font-semibold transition hover:bg-secondary/80"
          disabled={!appointment}
          onClick={() => onAction('no-show', appointment?.id)}
        >
          <XCircle className="h-3.5 w-3.5" />
          No asistió
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 h-9 rounded-full px-4 text-sm font-semibold transition hover:bg-secondary/80"
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
