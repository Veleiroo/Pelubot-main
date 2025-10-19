import { useMemo, useState } from 'react';
import { Calendar, CalendarClock, CheckCircle2, Clock, Loader2, Phone, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import { NO_SHOW_REASONS, STATUS_RING_STYLES } from '../constants';
import { STATUS_ACCENTS, STATUS_LABELS } from '../../shared/constants';
import { formatDate } from '../lib/format';
import type { AppointmentActionType, OverviewAppointmentEntry } from '../types';

type AppointmentCardProps = {
  appointment: OverviewAppointmentEntry | null | undefined;
  isLoading: boolean;
  onAction: (action: AppointmentActionType, appointmentId?: string, detail?: string) => Promise<void> | void;
  isRescheduling?: boolean;
};

export const AppointmentCard = ({ appointment, isLoading, onAction, isRescheduling = false }: AppointmentCardProps) => {
  const lastVisitLabel = useMemo(() => {
    if (!appointment?.lastVisit) return null;
    return formatDate(appointment.lastVisit);
  }, [appointment]);

  const badgeTone = appointment ? STATUS_RING_STYLES[appointment.status] : '';
  const [actionInFlight, setActionInFlight] = useState<AppointmentActionType | null>(null);

  const runAction = async (action: AppointmentActionType, detail?: string) => {
    if (!appointment?.id) return;
    setActionInFlight(action);
    try {
      await Promise.resolve(onAction(action, appointment.id, detail));
    } finally {
      setActionInFlight(null);
    }
  };

  const isBusy = (action: AppointmentActionType) => actionInFlight === action;

  return (
    <Card className="rounded-xl border border-border/50 bg-card p-6 shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl font-sans">
      <div className="mb-4">
        <p className="mb-2 text-xs uppercase tracking-[0.28em] text-muted-foreground">Próxima cita</p>
        <h2 className="mb-3 text-3xl font-semibold text-foreground">
          {isLoading ? <Skeleton className="h-8 w-1/2" /> : appointment?.client ?? 'Sin citas programadas'}
        </h2>
        {appointment ? (
          <>
            <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="font-semibold text-foreground">{appointment.time} h</span>
              <span className="text-muted-foreground/60">•</span>
              <div
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset backdrop-blur',
                  badgeTone
                )}
              >
                <span
                  className={cn('h-1.5 w-1.5 rounded-full', STATUS_ACCENTS[appointment.status].dot)}
                  aria-hidden="true"
                />
                <span className="capitalize">{STATUS_LABELS[appointment.status]}</span>
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
              <p className="mt-3 border-l-2 border-border pl-3 text-sm italic text-muted-foreground">{appointment.notes}</p>
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

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button
          size="sm"
          variant="primaryAction"
          className="flex-1 min-w-[120px]"
          disabled={!appointment || Boolean(actionInFlight)}
          onClick={() => void runAction('attended')}
        >
          {isBusy('attended') ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          <span>Asistida</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild disabled={!appointment || Boolean(actionInFlight)}>
            <Button size="sm" variant="outline" className="flex-1 min-w-[120px] justify-between">
              <span className="flex items-center gap-2">
                {isBusy('no-show') ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                No asistió
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onSelect={() => void runAction('no-show')}>Marcar sin motivo</DropdownMenuItem>
            {NO_SHOW_REASONS.map((option) => (
              <DropdownMenuItem key={option.value} onSelect={() => void runAction('no-show', option.label)}>
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 min-w-[120px]"
          disabled={!appointment || Boolean(actionInFlight) || isRescheduling}
          onClick={() => void runAction('reschedule')}
        >
          {isBusy('reschedule') || isRescheduling ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <CalendarClock className="h-3.5 w-3.5" />
          )}
          <span>Mover</span>
        </Button>
      </div>
    </Card>
  );
};

export default AppointmentCard;
