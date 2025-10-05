import { forwardRef } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

import { STATUS_STYLES } from '../../shared/constants';
import type { Appointment } from '../../shared/types';
import type { AgendaAppointmentsCardProps } from '../types';

const timeRangeLabel = (appointment: Appointment) =>
  appointment.endTime ? `${appointment.time} h · ${appointment.endTime} h` : `${appointment.time} h`;

const contactLabel = (appointment: Appointment) => {
  const parts = [appointment.clientPhone?.trim(), appointment.clientEmail?.trim()].filter(Boolean);
  if (parts.length === 0) return null;
  return parts.join(' · ');
};

export const AppointmentsCard = forwardRef<HTMLDivElement, AgendaAppointmentsCardProps>(
  ({ dayLabel, summary, appointments, isToday, onCreate, onAction, minHeight, height }, ref) => {
    const cardStyle = (() => {
      if (!height) return { minHeight } as const;
      const clamped = Math.max(height, minHeight);
      return { height: clamped, minHeight } as const;
    })();

    return (
      <Card
        ref={ref}
        className="flex h-full flex-col rounded-[28px] border border-white/12 bg-slate-950/65 p-6 text-white shadow-[0_18px_42px_rgba(2,6,23,0.5)] backdrop-blur"
        style={cardStyle}
      >
        <CardHeader className="flex flex-col gap-5 p-0">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-2xl font-semibold tracking-tight text-white">{dayLabel}</CardTitle>
                {isToday && (
                  <span className="inline-flex items-center rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100 ring-1 ring-emerald-400/40">
                    Hoy
                  </span>
                )}
              </div>
              <CardDescription className="text-sm text-white/70">
                {summary.total > 0
                  ? `${summary.total} citas programadas (${summary.confirmadas} confirmadas, ${summary.pendientes} pendientes).`
                  : 'No hay citas asignadas todavía.'}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              className="rounded-full border-emerald-400/50 bg-emerald-400/5 px-4 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/15"
              onClick={onCreate}
            >
              Crear cita
            </Button>
          </div>
          {summary.total > 0 && (
            <div className="flex flex-wrap gap-2 text-xs text-white/70">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400/80" />
                Confirmadas {summary.confirmadas}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                <span className="inline-flex h-2 w-2 rounded-full bg-amber-400/80" />
                Pendientes {summary.pendientes}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                <span className="inline-flex h-2 w-2 rounded-full bg-rose-400/80" />
                Canceladas {summary.canceladas}
              </span>
            </div>
          )}
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          {appointments.length > 0 ? (
            <ScrollArea className="relative h-full min-h-0 pr-2">
              <div className="space-y-4 pb-2">
                {appointments.map((appointment) => {
                  const contact = contactLabel(appointment);
                  return (
                    <article
                      key={appointment.id}
                      className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/85 transition hover:border-white/25 hover:bg-white/10"
                    >
                      <header className="flex flex-wrap items-center justify-between gap-3 text-white">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-sm font-semibold tabular-nums text-white/90">
                            {timeRangeLabel(appointment)}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${STATUS_STYLES[appointment.status]}`}
                          >
                            {appointment.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full border-emerald-300/60 bg-emerald-300/10 px-3 text-xs font-semibold text-emerald-100 hover:bg-emerald-300/20"
                            onClick={() => onAction('reschedule', appointment)}
                          >
                            Reprogramar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-full px-3 text-xs font-semibold text-rose-200 hover:bg-rose-400/15"
                            onClick={() => onAction('cancel', appointment)}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </header>
                      <div className="space-y-1 text-sm text-white/75">
                        <p className="text-base font-semibold text-white">{appointment.client}</p>
                        <p>{appointment.service}</p>
                        {contact && <p className="text-xs text-white/60">{contact}</p>}
                        {appointment.notes && <p className="text-xs text-white/60">{appointment.notes}</p>}
                      </div>
                    </article>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/12 bg-white/5 text-center text-sm text-white/65">
              <p>Este día está libre. Crea una nueva cita o marca un hueco disponible.</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
);

AppointmentsCard.displayName = 'AgendaAppointmentsCard';
