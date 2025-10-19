import { useMemo, useState, type ReactNode } from 'react';
import { CalendarClock, FileText, Loader2, Phone } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

import { NO_SHOW_REASONS, STATUS_RING_STYLES } from '../constants';
import { STATUS_ACCENTS, STATUS_LABELS } from '../../shared/constants';
import { formatDate } from '../lib/format';
import type { AppointmentActionType, OverviewAppointmentEntry } from '../types';

const buildMetadataItems = (appointment: OverviewAppointmentEntry | null): Array<{
  icon: ReactNode;
  label: string;
  title?: string;
}> => {
  if (!appointment) return [];
  const items: Array<{ icon: ReactNode; label: string; title?: string }> = [];

  if (appointment.phone) {
    items.push({
      icon: <Phone className="h-4 w-4 text-white/60" aria-hidden="true" />,
      label: appointment.phone,
      title: appointment.phone,
    });
  }

  const formattedLastVisit = formatDate(appointment.lastVisit ?? null);
  if (formattedLastVisit) {
    const content = `Última visita: ${formattedLastVisit}`;
    items.push({
      icon: <CalendarClock className="h-4 w-4 text-white/60" aria-hidden="true" />,
      label: content,
      title: content,
    });
  }

  if (appointment.notes) {
    items.push({
      icon: <FileText className="h-4 w-4 text-white/60" aria-hidden="true" />,
      label: appointment.notes,
      title: appointment.notes,
    });
  }

  return items;
};

interface UpcomingCardProps {
  appointment: OverviewAppointmentEntry | null;
  isLoading: boolean;
  errorMessage: string | null;
  onAction: (action: AppointmentActionType, detail?: string) => Promise<void> | void;
}

export const UpcomingCard = ({ appointment, isLoading, errorMessage, onAction }: UpcomingCardProps) => {
  const [actionInFlight, setActionInFlight] = useState<AppointmentActionType | null>(null);

  const metadataItems = useMemo(() => buildMetadataItems(appointment), [appointment]);
  const statusBadgeTone = appointment ? STATUS_RING_STYLES[appointment.status] : '';

  const runAction = async (action: AppointmentActionType, detail?: string) => {
    setActionInFlight(action);
    try {
      await Promise.resolve(onAction(action, detail));
    } finally {
      setActionInFlight(null);
    }
  };

  return (
    <Card className="rounded-3xl ring-1 ring-white/10 bg-white/5 shadow-lg shadow-emerald-900/25">
      <CardContent className="flex flex-col justify-between gap-4 p-4 text-sm leading-6 md:flex-row md:items-stretch md:gap-6 md:p-6">
        {isLoading ? (
          <div className="flex h-36 w-full items-center justify-center text-sm text-white/70">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Cargando próximas citas...
          </div>
        ) : appointment ? (
          <>
            <div className="flex w-full flex-col gap-2">
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/55">Próxima cita</p>
              <h1 className="truncate text-[26px] font-semibold text-white md:text-[28px]" title={appointment.client}>
                {appointment.client}
              </h1>
              <div className="space-y-1.5 text-white/80">
                <div className="flex flex-wrap items-center gap-2 text-sm tabular-nums">
                  <span>{appointment.time} h</span>
                  <span className="hidden text-white/40 sm:inline">•</span>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset backdrop-blur',
                      statusBadgeTone
                    )}
                  >
                    <span
                      className={cn('h-1.5 w-1.5 rounded-full', STATUS_ACCENTS[appointment.status].dot)}
                      aria-hidden="true"
                    />
                    <span className="capitalize">{STATUS_LABELS[appointment.status]}</span>
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="truncate" title={appointment.service}>
                    {appointment.service}
                  </span>
                </div>
              </div>
              {metadataItems.length > 0 ? (
                <div className="mt-2 space-y-1.5 text-sm text-white/70">
                  {metadataItems.map((item, index) => (
                    <p key={index} className="flex items-center gap-2 truncate" title={item.title}>
                      {item.icon}
                      <span className="truncate">{item.label}</span>
                    </p>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap md:h-full md:w-[220px] md:flex-col md:justify-center md:self-center">
              <Button
                variant="outline"
                size="sm"
                className="min-w-[140px]"
                disabled={Boolean(actionInFlight)}
                onClick={() => void runAction('attended')}
              >
                {actionInFlight === 'attended' ? <Loader2 className="size-4 animate-spin" /> : null}
                <span>{actionInFlight === 'attended' ? 'Marcando…' : 'Marcar como asistida'}</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild disabled={Boolean(actionInFlight)}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-w-[140px] justify-between border-rose-400/60 text-rose-200 hover:bg-rose-500/10"
                  >
                    <span className="flex items-center gap-2">
                      {actionInFlight === 'no-show' ? <Loader2 className="size-4 animate-spin" /> : null}
                      No asistió
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuItem onSelect={() => void runAction('no-show')}>Marcar sin motivo</DropdownMenuItem>
                  {NO_SHOW_REASONS.map((option) => (
                    <DropdownMenuItem key={option.value} onSelect={() => void runAction('no-show', option.label)}>
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="outline"
                size="sm"
                className="min-w-[140px]"
                disabled={Boolean(actionInFlight)}
                onClick={() => void runAction('reschedule')}
              >
                {actionInFlight === 'reschedule' ? <Loader2 className="size-4 animate-spin" /> : null}
                <span>{actionInFlight === 'reschedule' ? 'Abriendo…' : 'Mover cita'}</span>
              </Button>
            </div>
          </>
        ) : errorMessage ? (
          <p className="text-sm text-rose-200/80">{errorMessage}</p>
        ) : (
          <p className="text-sm text-white/60">No hay próximas citas programadas.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default UpcomingCard;
