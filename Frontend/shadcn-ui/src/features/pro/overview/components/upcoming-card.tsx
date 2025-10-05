import { useMemo, useState, type ReactNode } from 'react';
import { CalendarClock, FileText, Loader2, Phone } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { NO_SHOW_REASONS, STATUS_TONE } from '../constants';
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
  onAction: (action: AppointmentActionType, detail?: string) => void;
}

export const UpcomingCard = ({ appointment, isLoading, errorMessage, onAction }: UpcomingCardProps) => {
  const [showNoShowSelect, setShowNoShowSelect] = useState(false);
  const [noShowReason, setNoShowReason] = useState<string | null>(null);

  const metadataItems = useMemo(() => buildMetadataItems(appointment), [appointment]);

  const handleToggleNoShow = () => {
    setShowNoShowSelect((prev) => !prev);
    setNoShowReason(null);
  };

  const handleSelectReason = (value: string) => {
    const reasonLabel = NO_SHOW_REASONS.find((item) => item.value === value)?.label ?? value;
    setNoShowReason(value);
    setShowNoShowSelect(false);
    onAction('no-show', `Motivo seleccionado: ${reasonLabel}`);
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
                  <span className={`capitalize ${STATUS_TONE[appointment.status]}`}>{appointment.status}</span>
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

            <div className="flex w-full flex-col gap-2 md:h-full md:w-[200px] md:justify-center md:self-center">
              <Button
                variant="outline"
                className="h-9 w-full rounded-full border-emerald-400/60 px-4 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/10"
                onClick={() => {
                  setShowNoShowSelect(false);
                  onAction('attended');
                }}
              >
                Marcar como asistida
              </Button>
              <div className="flex w-full flex-col gap-1.5">
                <Button
                  variant="outline"
                  className="h-9 w-full rounded-full border-rose-400/60 px-4 text-sm font-semibold text-rose-200 hover:bg-rose-500/10"
                  onClick={handleToggleNoShow}
                >
                  No asistió
                </Button>
                {showNoShowSelect ? (
                  <Select value={noShowReason ?? undefined} onValueChange={handleSelectReason}>
                    <SelectTrigger className="h-9 w-full rounded-full border border-white/15 bg-white/5 text-left text-sm font-medium text-white/80 hover:bg-white/10">
                      <SelectValue placeholder="Selecciona motivo" />
                    </SelectTrigger>
                    <SelectContent align="end" className="min-w-[220px] md:min-w-[260px]">
                      {NO_SHOW_REASONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}
              </div>
              <Button
                variant="outline"
                className="h-9 w-full rounded-full border-white/25 px-4 text-sm font-semibold text-white/80 hover:bg-white/10"
                onClick={() => {
                  setShowNoShowSelect(false);
                  onAction('reschedule');
                }}
              >
                Mover cita
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
