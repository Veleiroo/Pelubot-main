import { forwardRef } from 'react';
import { Calendar, Check, Clock, Mail, MessageSquare, Phone, Plus, Trash2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  ({ dayLabel, summary, appointments, isToday, onCreate, onAction, minHeight, height }, ref) => {
    const cardStyle = (() => {
      if (!height) return { minHeight } as const;
      const clamped = Math.max(height, minHeight);
      return { height: clamped, minHeight } as const;
    })();

    return (
      <Card
        ref={ref}
        className="group relative flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-border/60 bg-card/80 text-foreground shadow-soft transition-colors duration-300"
        style={cardStyle}
      >
        {/* Header fijo con backdrop-blur */}
        <div className="sticky top-0 z-10 shrink-0 space-y-3 border-b border-border/60 bg-card/90 px-4 pb-3 pt-4 backdrop-blur-sm sm:space-y-4 sm:px-6 sm:pb-4 sm:pt-5 md:px-8">
          <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <CardTitle className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl md:text-3xl">
                {dayLabel}
              </CardTitle>
              {isToday && (
                <Badge
                  variant="outline"
                  className="rounded-full border-primary/40 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground sm:text-xs"
                >
                  Hoy
                </Badge>
              )}
            </div>
            <Button
              variant="default"
              size="sm"
              className="gap-2 rounded-full bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary sm:px-4 sm:text-sm"
              onClick={onCreate}
              aria-label="Crear nueva cita"
            >
              <Plus className="h-4 w-4" />
              <span>Crear cita</span>
            </Button>
          </div>
          
          {/* Stats con iconos de Lucide */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:gap-3 sm:text-sm">
            <span className="font-medium text-foreground">
              {summary.total > 0
                ? `${summary.total} ${summary.total === 1 ? 'cita' : 'citas'}`
                : 'Sin citas'}
            </span>
            {summary.total > 0 && (
              <>
                <span className="text-muted-foreground/60">•</span>
                <div className="flex flex-wrap gap-2">
                  {summary.confirmadas > 0 && (
                    <Badge
                      variant="outline"
                      className="gap-1.5 border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>{summary.confirmadas}</span>
                    </Badge>
                  )}
                  {summary.pendientes > 0 && (
                    <Badge variant="outline" className="gap-1.5 border-amber-500/30 bg-amber-500/10 text-amber-200">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{summary.pendientes}</span>
                    </Badge>
                  )}
                  {summary.canceladas > 0 && (
                    <Badge variant="outline" className="gap-1.5 border-rose-500/30 bg-rose-500/10 text-rose-200">
                      <X className="h-3.5 w-3.5" />
                      <span>{summary.canceladas}</span>
                    </Badge>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Contenido con scroll personalizado */}
        <CardContent className="appointments-container flex-1 overflow-hidden px-4 pb-4 pt-3 sm:px-6 sm:pb-6 sm:pt-4 md:px-8">
          {appointments.length > 0 ? (
            <ScrollArea className="h-full pr-1 sm:pr-2">
              <div className="space-y-3">
                {appointments.map((appointment, index) => {
                  const contact = contactLabel(appointment);
                  const statusColor =
                    appointment.status === 'confirmada'
                      ? 'border-l-emerald-500/60 bg-emerald-500/8'
                      : appointment.status === 'pendiente'
                      ? 'border-l-amber-500/60 bg-amber-500/8'
                      : 'border-l-rose-500/60 bg-rose-500/8';

                  return (
                    <article
                      key={appointment.id}
                      style={{
                        animationDelay: `${index * 50}ms`,
                      }}
                      className={cn(
                        'group/card relative overflow-hidden rounded-2xl border border-border/60 border-l-4 p-4 text-sm shadow-soft transition-transform duration-200 animate-in fade-in slide-in-from-bottom-4 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card/85 sm:p-5',
                        statusColor
                      )}
                    >
                      {/* Botones en absolute top-right */}
                      <div className="absolute right-3 top-3 flex gap-1.5 sm:right-4 sm:top-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1 rounded-full border-border/60 bg-background/60 px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary"
                          onClick={() => onAction('reschedule', appointment)}
                          title="Reprogramar cita"
                          aria-label="Reprogramar cita"
                        >
                          <Calendar className="h-3 w-3" />
                          <span className="hidden sm:inline">Reprog.</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1 rounded-full border-border/60 bg-background/60 px-3 text-xs font-medium text-destructive transition-colors hover:border-destructive/40 hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-destructive"
                          onClick={() => onAction('cancel', appointment)}
                          title="Cancelar cita"
                          aria-label="Cancelar cita"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span className="hidden sm:inline">Cancel.</span>
                        </Button>
                      </div>

                      <div className="pr-24">
                        <div className="space-y-2">
                          {/* Hora y Estado */}
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center rounded-lg border border-border/60 bg-background/60 px-3 py-1.5 text-sm font-medium text-foreground tabular-nums">
                              {timeRangeLabel(appointment)}
                            </span>
                            <span
                              className={cn(
                                'inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold uppercase tracking-wide',
                                STATUS_STYLES[appointment.status]
                              )}
                            >
                              {appointment.status}
                            </span>
                          </div>

                          {/* Cliente y Servicio */}
                          <div className="space-y-0.5">
                            <p className="text-base font-semibold text-foreground transition-colors duration-200 group-hover/card:text-primary">
                              {appointment.client}
                            </p>
                            <p className="text-xs font-medium text-muted-foreground transition-colors duration-200 group-hover/card:text-foreground">
                              {appointment.service}
                            </p>
                          </div>

                          {/* Contacto con iconos */}
                          {contact && (
                            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                              {contact.phone && (
                                <div className="flex items-center gap-1.5">
                                  <Phone className="h-3.5 w-3.5" />
                                  <span>{contact.phone}</span>
                                </div>
                              )}
                              {contact.email && (
                                <div className="flex items-center gap-1.5">
                                  <Mail className="h-3.5 w-3.5" />
                                  <span>{contact.email}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Notas interactivas */}
                        {appointment.notes && (
                          <button
                            className="mt-3 flex w-full items-start gap-2 rounded-lg border border-border/60 bg-background/50 p-2.5 text-left text-xs text-muted-foreground transition-colors duration-200 hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                            onClick={() => {
                              // Aquí podrías abrir un modal o tooltip con las notas
                              console.log('Ver notas:', appointment.notes);
                            }}
                            aria-label="Ver notas de la cita"
                          >
                            <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <span className="flex-1">{appointment.notes}</span>
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <div className="relative flex h-full min-h-[240px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/60 bg-background/40 text-center sm:min-h-[280px]">
              <div className="space-y-3 p-6 sm:space-y-4 sm:p-8">
                <p className="text-4xl sm:text-5xl">📅</p>
                <p className="text-lg font-semibold text-foreground sm:text-xl">Día libre</p>
                <p className="text-xs text-muted-foreground sm:text-sm">Este día no tiene citas programadas</p>
                <p className="text-[10px] text-muted-foreground/80 sm:text-xs">
                  Haz clic en "Crear cita" para agregar una nueva
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
);

AppointmentsCard.displayName = 'AgendaAppointmentsCard';
