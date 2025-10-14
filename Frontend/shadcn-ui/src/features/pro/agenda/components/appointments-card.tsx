import { forwardRef } from 'react';
import { Calendar, Mail, Phone, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
    const statusAccentBorders: Record<Appointment['status'], string> = {
      confirmada: 'border-l-primary',
      pendiente: 'border-l-amber-400',
      cancelada: 'border-l-rose-400',
    };

    return (
      <Card
        ref={ref}
        className="flex h-full flex-col border border-border/50 bg-card text-card-foreground shadow-sm"
      >
        <CardHeader className="gap-3 border-b border-border/50 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-lg font-semibold">{dayLabel}</CardTitle>
              <CardDescription className="text-xs text-muted-foreground sm:text-sm">
                {summary.total > 0
                  ? `${summary.total} ${summary.total === 1 ? 'cita programada' : 'citas programadas'}`
                  : 'Sin citas registradas'}
              </CardDescription>
              {isToday ? (
                <Badge variant="outline" className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                  Hoy
                </Badge>
              ) : null}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 hover:text-primary sm:text-sm"
              onClick={onCreate}
              aria-label="Crear nueva cita"
            >
              <Plus className="h-4 w-4" />
              Crear cita
            </Button>
          </div>

          {summary.total > 0 && (
            <dl className="flex flex-wrap gap-3 text-xs text-muted-foreground sm:text-sm">
              <div className="flex items-center gap-2">
                <dt className="font-medium text-foreground">Confirmadas</dt>
                <dd>
                  <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                    {summary.confirmadas}
                  </Badge>
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <dt className="font-medium text-foreground">Pendientes</dt>
                <dd>
                  <Badge className="border-amber-200 bg-amber-50 text-amber-700">
                    {summary.pendientes}
                  </Badge>
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <dt className="font-medium text-foreground">Canceladas</dt>
                <dd>
                  <Badge className="border-rose-200 bg-rose-50 text-rose-700">
                    {summary.canceladas}
                  </Badge>
                </dd>
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
                      <Card
                        className={cn(
                          'group flex flex-col gap-4 border border-border/60 bg-card text-card-foreground shadow-sm transition hover:shadow-md',
                          'border-l-4',
                          statusAccentBorders[appointment.status]
                        )}
                      >
                        <CardContent className="flex flex-col gap-4 p-4 text-sm">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <Badge
                              variant="outline"
                              className="rounded-md border-border/60 bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground"
                            >
                              {timeRangeLabel(appointment)}
                            </Badge>
                            <Badge
                              className={cn(
                                'rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide',
                                STATUS_STYLES[appointment.status]
                              )}
                            >
                              {appointment.status}
                            </Badge>
                          </div>

                          <div className="space-y-1">
                            <p className="text-base font-semibold text-foreground">{appointment.client}</p>
                            <p className="text-xs text-muted-foreground">{appointment.service}</p>
                          </div>

                          {contact ? (
                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                              {contact.phone ? (
                                <span className="flex items-center gap-1.5">
                                  <Phone className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                                  <span>{contact.phone}</span>
                                </span>
                              ) : null}
                              {contact.email ? (
                                <span className="flex items-center gap-1.5">
                                  <Mail className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                                  <span>{contact.email}</span>
                                </span>
                              ) : null}
                            </div>
                          ) : null}

                          {appointment.notes ? (
                            <p className="rounded-lg border border-border/40 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                              Notas: {appointment.notes}
                            </p>
                          ) : null}

                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2 rounded-md border-border/60 bg-transparent px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary"
                              onClick={() => onAction('reschedule', appointment)}
                              aria-label="Reprogramar cita"
                            >
                              <Calendar className="h-4 w-4" />
                              Reprogramar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2 rounded-md border-rose-200 bg-rose-50/60 px-3 py-2 text-xs text-rose-600 transition-colors hover:bg-rose-100"
                              onClick={() => onAction('cancel', appointment)}
                              aria-label="Cancelar cita"
                            >
                              <Trash2 className="h-4 w-4" />
                              Cancelar
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          ) : (
            <div className="flex h-full min-h-[240px] flex-col items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 text-center">
              <p className="text-4xl">📅</p>
              <p className="mt-2 text-base font-semibold text-foreground">Día libre</p>
              <p className="text-xs text-muted-foreground">No hay citas programadas para esta fecha.</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
);

AppointmentsCard.displayName = 'AgendaAppointmentsCard';
