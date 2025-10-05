import { forwardRef } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

import { STATUS_STYLES } from '../../shared/constants';
import type { Appointment } from '../../shared/types';
import type { AgendaAppointmentsCardProps } from '../types';

export const AppointmentsCard = forwardRef<HTMLDivElement, AgendaAppointmentsCardProps>(
  ({ dayLabel, summary, appointments, onCreate, onAction, minHeight, height }, ref) => {
    const cardStyle = (() => {
      if (!height) return { minHeight } as const;
      const clamped = Math.max(height, minHeight);
      return { height: clamped, minHeight } as const;
    })();

    return (
      <Card
        ref={ref}
        className="text-card-foreground flex flex-col rounded-3xl border border-white/10 bg-white/8 p-6 shadow-lg shadow-emerald-900/25 backdrop-blur"
        style={cardStyle}
      >
      <CardHeader className="flex flex-col gap-4 p-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg font-semibold text-white">{dayLabel}</CardTitle>
            <CardDescription className="text-sm text-white/70">
              {summary.total > 0
                ? `${summary.total} citas programadas para este día.`
                : 'No hay citas asignadas todavía.'}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            className="rounded-full border-emerald-400/60 px-4 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/10"
            onClick={onCreate}
          >
            Crear nueva cita
          </Button>
        </div>
        {summary.total > 0 && (
          <div className="flex flex-wrap gap-2 text-xs text-white/70">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400/80" />
              Confirmadas {summary.confirmadas}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1">
              <span className="inline-flex h-2 w-2 rounded-full bg-amber-400/80" />
              Pendientes {summary.pendientes}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1">
              <span className="inline-flex h-2 w-2 rounded-full bg-rose-400/80" />
              Canceladas {summary.canceladas}
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent className="mt-5 flex-1 overflow-hidden p-0">
        {appointments.length > 0 ? (
          <ScrollArea className="relative h-full min-h-0 pr-2">
            <div className="space-y-4 pb-2">
              {appointments.map((appointment) => (
                <article
                  key={appointment.id}
                  className="flex flex-col gap-3 rounded-2xl bg-white/5 p-4 text-sm text-white/80 ring-1 ring-white/10 transition hover:bg-white/10 hover:ring-white/30"
                >
                  <header className="flex flex-wrap items-center justify-between gap-3 text-white">
                    <div className="flex items-center gap-3">
                      <span className="text-base font-semibold tabular-nums">{appointment.time} h</span>
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide ${STATUS_STYLES[appointment.status]}`}
                      >
                        {appointment.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full border-emerald-400/60 px-3 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/10"
                        onClick={() => onAction('reschedule', appointment)}
                      >
                        Reprogramar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-full px-3 text-xs font-semibold text-rose-200 hover:bg-rose-500/10"
                        onClick={() => onAction('cancel', appointment)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </header>
                  <div className="space-y-1 text-white/75">
                    <p className="text-sm font-semibold text-white">{appointment.client}</p>
                    <p className="text-sm">{appointment.service}</p>
                    {appointment.notes && <p className="text-xs text-white/60">{appointment.notes}</p>}
                  </div>
                </article>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/5 text-center text-sm text-white/70">
            <p>Este día está libre. Crea una nueva cita o marca un hueco disponible.</p>
          </div>
        )}
      </CardContent>
      </Card>
    );
  }
);

AppointmentsCard.displayName = 'AgendaAppointmentsCard';
