import { forwardRef } from 'react';

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
        className="group relative flex h-full flex-col overflow-hidden rounded-[2rem] border border-slate-700/40 bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 text-white shadow-2xl shadow-slate-950/50 backdrop-blur-xl transition-all duration-300 hover:shadow-emerald-500/5"
        style={cardStyle}
      >
        {/* Efecto de luz superior */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
        
        {/* Header fijo con backdrop-blur */}
        <div className="sticky top-0 z-10 shrink-0 space-y-3 border-b border-slate-700/30 bg-gradient-to-b from-slate-800/95 to-slate-900/50 px-4 pb-3 pt-4 backdrop-blur-md sm:space-y-4 sm:px-6 sm:pb-4 sm:pt-5 md:px-8">
          <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <CardTitle className="bg-gradient-to-br from-white to-slate-200 bg-clip-text text-xl font-black tracking-tight text-transparent sm:text-2xl md:text-3xl">
                {dayLabel}
              </CardTitle>
              {isToday && (
                <span className="group/badge relative inline-flex items-center overflow-hidden rounded-lg bg-gradient-to-br from-emerald-500/30 to-emerald-600/30 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-200 shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-400/50 backdrop-blur-sm transition-all duration-300 hover:shadow-emerald-500/30 hover:ring-emerald-400/70 sm:rounded-xl sm:px-3 sm:py-1.5 sm:text-xs">
                  <span className="absolute inset-0 bg-gradient-to-r from-emerald-400/0 via-emerald-400/20 to-emerald-400/0 opacity-0 transition-opacity duration-300 group-hover/badge:opacity-100 animate-pulse" />
                  <span className="relative">Hoy</span>
                </span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="group/btn relative overflow-hidden rounded-lg border-emerald-500/50 bg-gradient-to-br from-emerald-500/25 to-emerald-600/20 px-3 py-1.5 text-[11px] font-bold text-emerald-50 shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-400/30 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:border-emerald-400/70 hover:shadow-xl hover:shadow-emerald-500/30 hover:ring-emerald-400/50 sm:rounded-xl sm:px-4 sm:py-2 sm:text-xs"
              onClick={onCreate}
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover/btn:translate-x-full" />
              <span className="relative flex items-center gap-1 sm:gap-1.5">
                <span className="text-sm sm:text-base">+</span>
                <span>Crear cita</span>
              </span>
            </Button>
          </div>
          
          {/* Stats compactos */}
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
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-200 backdrop-blur-sm">
                    <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
                    {summary.confirmadas}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 text-xs font-bold text-amber-200 backdrop-blur-sm">
                    <span className="inline-flex h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.9)]" />
                    {summary.pendientes}
                  </span>
                  {summary.canceladas > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/15 px-2.5 py-1 text-xs font-bold text-rose-200 backdrop-blur-sm">
                      <span className="inline-flex h-1.5 w-1.5 rounded-full bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.9)]" />
                      {summary.canceladas}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Contenido con scroll */}
        <CardContent className="flex-1 overflow-hidden px-4 pb-4 pt-3 sm:px-6 sm:pb-6 sm:pt-4 md:px-8">
          {appointments.length > 0 ? (
            <ScrollArea className="h-full pr-1 sm:pr-2">
              <div className="space-y-2.5 sm:space-y-3">
                {appointments.map((appointment) => {
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
                      className={cn(
                        'group/card relative overflow-hidden rounded-lg border border-slate-600/40 border-l-4 bg-gradient-to-br from-slate-800/40 to-slate-900/40 p-3 text-sm shadow-md shadow-slate-950/20 backdrop-blur-md transition-all duration-300 hover:scale-[1.02] hover:border-slate-500/60 hover:shadow-lg hover:shadow-slate-950/30 sm:rounded-xl sm:p-4',
                        statusColor
                      )}
                    >
                      {/* Gradiente animado en hover */}
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/0 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover/card:opacity-[0.02]" />

                      <div className="flex items-start justify-between gap-2 sm:gap-3">
                        <div className="flex-1 space-y-1.5 sm:space-y-2">
                          {/* Hora y Estado */}
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                            <span className="inline-flex items-center rounded-md bg-slate-700/60 px-2 py-1 text-xs font-bold tabular-nums text-white ring-1 ring-slate-600/50 backdrop-blur-sm sm:rounded-lg sm:px-3 sm:py-1.5 sm:text-sm">
                              {timeRangeLabel(appointment)}
                            </span>
                            <span
                              className={cn(
                                'inline-flex items-center rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-wide backdrop-blur-sm sm:rounded-lg sm:px-2.5 sm:py-1 sm:text-[10px]',
                                STATUS_STYLES[appointment.status]
                              )}
                            >
                              {appointment.status}
                            </span>
                          </div>

                          {/* Cliente y Servicio */}
                          <div className="space-y-0.5">
                            <p className="text-sm font-bold text-white transition-colors duration-300 group-hover/card:text-emerald-100 sm:text-base">
                              {appointment.client}
                            </p>
                            <p className="text-[11px] font-semibold text-slate-400 transition-colors duration-300 group-hover/card:text-slate-300 sm:text-xs">
                              {appointment.service}
                            </p>
                          </div>

                          {/* Contacto compacto */}
                          {contact && (
                            <p className="text-[10px] text-slate-500 transition-colors duration-300 group-hover/card:text-slate-400 sm:text-[11px]">
                              📞 {contact}
                            </p>
                          )}
                        </div>

                        {/* Botones compactos verticales */}
                        <div className="flex shrink-0 flex-col gap-1 sm:gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 rounded-md bg-emerald-500/15 px-2 text-[9px] font-bold text-emerald-200 ring-1 ring-emerald-500/30 backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:bg-emerald-500/25 hover:ring-emerald-500/50 sm:h-7 sm:rounded-lg sm:px-2.5 sm:text-[10px]"
                            onClick={() => onAction('reschedule', appointment)}
                            title="Reprogramar"
                          >
                            Reprog.
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 rounded-md bg-rose-500/15 px-2 text-[9px] font-bold text-rose-200 ring-1 ring-rose-500/30 backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:bg-rose-500/25 hover:ring-rose-500/50 sm:h-7 sm:rounded-lg sm:px-2.5 sm:text-[10px]"
                            onClick={() => onAction('cancel', appointment)}
                            title="Cancelar"
                          >
                            Cancel.
                          </Button>
                        </div>
                      </div>

                      {/* Notas si existen */}
                      {appointment.notes && (
                        <div className="mt-1.5 border-t border-slate-700/30 pt-1.5 sm:mt-2 sm:pt-2">
                          <p className="text-[10px] italic text-slate-500 sm:text-[11px]">💬 {appointment.notes}</p>
                        </div>
                      )}
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
