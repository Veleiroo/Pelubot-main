import { forwardRef } from 'react';
import { Calendar, Check, Clock, Mail, MessageSquare, Phone, Trash2, X } from 'lucide-react';

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
  ({ dayLabel, summary, appointments, isToday, onCreate, onAction, minHeight, height }, ref) => {
    const cardStyle = (() => {
      if (!height) return { minHeight } as const;
      const clamped = Math.max(height, minHeight);
      return { height: clamped, minHeight } as const;
    })();

    return (
      <Card
        ref={ref}
        className="group relative flex h-full flex-col overflow-hidden rounded-[2rem] border border-slate-700/40 bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 text-white shadow-2xl shadow-slate-950/50 backdrop-blur-xl transition-all duration-300 hover:shadow-emerald-500/5"
        style={cardStyle}
      >
        {/* Efecto de luz superior */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
        
        {/* Header fijo con backdrop-blur y glassmorphism */}
        <div className="sticky top-0 z-10 shrink-0 space-y-3 border-b border-slate-700/30 bg-gradient-to-r from-slate-800/50 to-slate-800/0 px-4 pb-3 pt-4 backdrop-blur-sm sm:space-y-4 sm:px-6 sm:pb-4 sm:pt-5 md:px-8">
          <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <CardTitle className="bg-gradient-to-br from-white to-slate-200 bg-clip-text text-xl font-black tracking-tight text-transparent sm:text-2xl md:text-3xl">
                {dayLabel}
              </CardTitle>
              {isToday && (
                <span className="relative inline-flex items-center overflow-hidden rounded-lg border border-emerald-500/50 bg-emerald-500/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-400 shadow-lg shadow-emerald-500/20 backdrop-blur-sm sm:rounded-xl sm:px-3 sm:py-1.5 sm:text-xs">
                  <span className="relative">Hoy</span>
                </span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="group/btn relative overflow-hidden rounded-lg border-emerald-500/50 bg-gradient-to-br from-emerald-500/25 to-emerald-600/20 px-3 py-1.5 text-[11px] font-bold text-emerald-50 shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-400/30 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:border-emerald-400/70 hover:shadow-xl hover:shadow-emerald-500/30 hover:ring-emerald-400/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800 sm:rounded-xl sm:px-4 sm:py-2 sm:text-xs"
              onClick={onCreate}
              aria-label="Crear nueva cita"
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover/btn:translate-x-full" />
              <span className="relative flex items-center gap-1 sm:gap-1.5">
                <span className="text-sm sm:text-base">+</span>
                <span>Crear cita</span>
              </span>
            </Button>
          </div>
          
          {/* Stats con iconos de Lucide */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs sm:gap-2 sm:text-sm">
            <span className="font-semibold text-slate-300">
              {summary.total > 0
                ? `${summary.total} ${summary.total === 1 ? 'cita' : 'citas'}`
                : 'Sin citas'}
            </span>
            {summary.total > 0 && (
              <>
                <span className="text-slate-600">•</span>
                <div className="flex flex-wrap gap-2">
                  {summary.confirmadas > 0 && (
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 backdrop-blur-sm">
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-xs font-bold text-emerald-200">{summary.confirmadas}</span>
                    </div>
                  )}
                  {summary.pendientes > 0 && (
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 backdrop-blur-sm">
                      <Clock className="h-3.5 w-3.5 text-amber-400" />
                      <span className="text-xs font-bold text-amber-200">{summary.pendientes}</span>
                    </div>
                  )}
                  {summary.canceladas > 0 && (
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 backdrop-blur-sm">
                      <X className="h-3.5 w-3.5 text-rose-400" />
                      <span className="text-xs font-bold text-rose-200">{summary.canceladas}</span>
                    </div>
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
                      ? 'border-l-emerald-500 bg-emerald-500/5'
                      : appointment.status === 'pendiente'
                      ? 'border-l-amber-500 bg-amber-500/5'
                      : 'border-l-rose-500 bg-rose-500/5';

                  return (
                    <article
                      key={appointment.id}
                      style={{
                        animationDelay: `${index * 50}ms`,
                      }}
                      className={cn(
                        'group/card relative overflow-hidden rounded-xl border border-slate-600/40 border-l-4 bg-slate-800/40 p-3 text-sm shadow-xl shadow-slate-950/20 backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 hover:-translate-y-1 hover:scale-[1.02] hover:border-slate-500/60 hover:shadow-2xl hover:shadow-emerald-500/10 sm:p-4',
                        statusColor
                      )}
                    >
                      {/* Gradiente animado en hover */}
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/0 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover/card:opacity-[0.02]" />

                      {/* Botones en absolute top-right */}
                      <div className="absolute right-3 top-3 flex gap-1.5 sm:right-4 sm:top-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 rounded-lg bg-emerald-500/15 px-2.5 text-xs font-bold text-emerald-200 ring-1 ring-emerald-500/30 backdrop-blur-sm transition-all duration-200 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800"
                          onClick={() => onAction('reschedule', appointment)}
                          title="Reprogramar cita"
                          aria-label="Reprogramar cita"
                        >
                          <Calendar className="h-3 w-3" />
                          <span className="hidden sm:inline">Reprog.</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 rounded-lg bg-rose-500/15 px-2.5 text-xs font-bold text-rose-200 ring-1 ring-rose-500/30 backdrop-blur-sm transition-all duration-200 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800"
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
                            <span className="font-mono inline-flex items-center rounded-lg bg-slate-700/60 px-3 py-1.5 text-sm font-bold tabular-nums text-slate-300 ring-1 ring-slate-600/50 backdrop-blur-sm">
                              {timeRangeLabel(appointment)}
                            </span>
                            <span
                              className={cn(
                                'inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-black uppercase tracking-wide backdrop-blur-sm',
                                STATUS_STYLES[appointment.status]
                              )}
                            >
                              {appointment.status}
                            </span>
                          </div>

                          {/* Cliente y Servicio */}
                          <div className="space-y-0.5">
                            <p className="text-base font-bold text-white transition-colors duration-300 group-hover/card:text-emerald-100">
                              {appointment.client}
                            </p>
                            <p className="text-xs font-semibold text-slate-400 transition-colors duration-300 group-hover/card:text-slate-300">
                              {appointment.service}
                            </p>
                          </div>

                          {/* Contacto con iconos */}
                          {contact && (
                            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
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
                            className="mt-3 flex w-full items-start gap-2 rounded-lg border border-slate-700/30 bg-slate-800/30 p-2.5 text-left text-xs italic text-slate-500 transition-colors duration-200 hover:text-emerald-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800"
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
            <div className="group/empty relative flex h-full min-h-[240px] flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-600/30 bg-gradient-to-br from-slate-800/30 to-slate-900/30 text-center backdrop-blur-sm transition-all duration-300 hover:border-slate-500/40 hover:bg-slate-800/40 sm:min-h-[280px] sm:rounded-2xl">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/0 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover/empty:opacity-5" />
              <div className="relative space-y-2 p-6 sm:space-y-3 sm:p-8">
                <p className="text-4xl transition-transform duration-300 group-hover/empty:scale-110 sm:text-5xl">📅</p>
                <p className="text-lg font-black text-white sm:text-xl">Día libre</p>
                <p className="text-xs font-medium text-slate-400 sm:text-sm">Este día no tiene citas programadas</p>
                <p className="text-[10px] text-slate-500 sm:text-xs">Haz clic en "Crear cita" para agregar una nueva</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
);

AppointmentsCard.displayName = 'AgendaAppointmentsCard';
