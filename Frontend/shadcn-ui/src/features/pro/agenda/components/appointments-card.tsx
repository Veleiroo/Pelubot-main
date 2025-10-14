import { forwardRef } from 'react';
import { Calendar, Mail, Phone, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

import { STATUS_STYLES } from '../../shared/constants';
import type { Appointment } from '../../shared/types';
import type { AgendaAppointmentsCardProps } from '../types';

const timeRangeLabel = (appointment: Appointment) =>
  appointment.endTime ? `${appointment.time} h · ${appointment.endTime} h` : `${appointment.time} h`;

const contactLabel = (appointment: Appointment) => {
  const phone = appointment.clientPhone?.trim();
  const email = appointment.clientEmail?.trim();

  if (!phone && !email) return null;

  return { phone, email };
};

export const AppointmentsCard = forwardRef<HTMLDivElement, AgendaAppointmentsCardProps>(
  ({ dayLabel, summary, appointments, isToday, onCreate, onAction }, ref) => {
    return (
      <Card ref={ref} className="flex h-full flex-col border-white/10 bg-slate-950/60 text-white">
        <CardHeader className="gap-3 border-b border-white/10 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-lg font-semibold">{dayLabel}</CardTitle>
              <CardDescription className="text-xs text-white/70 sm:text-sm">
                {summary.total > 0
                  ? `${summary.total} ${summary.total === 1 ? 'cita programada' : 'citas programadas'}`
                  : 'Sin citas registradas'}
              </CardDescription>
              {isToday && <p className="text-xs font-medium uppercase tracking-wide text-emerald-300">Hoy</p>}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10 hover:text-white sm:text-sm"
              onClick={onCreate}
              aria-label="Crear nueva cita"
            >
              <Plus className="h-4 w-4" />
              Crear cita
            </Button>
          </div>

          {summary.total > 0 && (
            <dl className="flex flex-wrap gap-3 text-xs text-white/60 sm:text-sm">
              <div className="flex items-center gap-2">
                <dt className="font-medium text-white">Confirmadas</dt>
                <dd className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-white">{summary.confirmadas}</dd>
              </div>
              <div className="flex items-center gap-2">
                <dt className="font-medium text-white">Pendientes</dt>
                <dd className="rounded-full bg-amber-500/20 px-2 py-0.5 text-white">{summary.pendientes}</dd>
              </div>
              <div className="flex items-center gap-2">
                <dt className="font-medium text-white">Canceladas</dt>
                <dd className="rounded-full bg-rose-500/20 px-2 py-0.5 text-white">{summary.canceladas}</dd>
              </div>
            </dl>
          )}
        </CardHeader>
        <CardContent className="flex flex-1 flex-col px-4 pb-4 pt-3 sm:px-6 sm:pb-6 sm:pt-4">
          {appointments.length > 0 ? (
            <ScrollArea className="h-full pr-1 sm:pr-2">
              <ul className="space-y-3">
                {appointments.map((appointment) => {
                  const contact = contactLabel(appointment);

                  return (
                    <li key={appointment.id}>
                      <article className="relative flex flex-col gap-3 rounded-lg border border-white/10 bg-white/5 p-4 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <span className="inline-flex items-center rounded-md bg-white/10 px-3 py-1 text-sm font-medium tabular-nums">
                            {timeRangeLabel(appointment)}
                          </span>
                          <span
                            className={cn(
                              'inline-flex items-center rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide',
                              STATUS_STYLES[appointment.status]
                            )}
                          >
                            {appointment.status}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <p className="text-base font-semibold text-white">{appointment.client}</p>
                          <p className="text-xs text-white/70">{appointment.service}</p>
                        </div>

                        {contact && (
                          <div className="flex flex-wrap items-center gap-3 text-xs text-white/70">
                            {contact.phone && (
                              <span className="flex items-center gap-1.5">
                                <Phone className="h-3.5 w-3.5" aria-hidden />
                                <span>{contact.phone}</span>
                              </span>
                            )}
                            {contact.email && (
                              <span className="flex items-center gap-1.5">
                                <Mail className="h-3.5 w-3.5" aria-hidden />
                                <span>{contact.email}</span>
                              </span>
                            )}
                          </div>
                        )}

                        {appointment.notes && (
                          <p className="rounded-md bg-white/5 px-3 py-2 text-xs text-white/70">Notas: {appointment.notes}</p>
                        )}

                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-2 rounded-md border border-white/10 bg-transparent px-3 py-2 text-xs text-white hover:bg-white/10"
                            onClick={() => onAction('reschedule', appointment)}
                            aria-label="Reprogramar cita"
                          >
                            <Calendar className="h-4 w-4" />
                            Reprogramar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-2 rounded-md border border-rose-400/40 bg-transparent px-3 py-2 text-xs text-rose-200 hover:bg-rose-500/20"
                            onClick={() => onAction('cancel', appointment)}
                            aria-label="Cancelar cita"
                          >
                            <Trash2 className="h-4 w-4" />
                            Cancelar
                          </Button>
                        </div>
                      </article>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          ) : (
            <div className="flex h-full min-h-[240px] flex-col items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/5 text-center">
              <p className="text-4xl">📅</p>
              <p className="mt-2 text-base font-semibold text-white">Día libre</p>
              <p className="text-xs text-white/60">No hay citas programadas para esta fecha.</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
);

AppointmentsCard.displayName = 'AgendaAppointmentsCard';
