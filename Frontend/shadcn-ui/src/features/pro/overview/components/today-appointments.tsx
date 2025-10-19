import { useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, Clock, Loader2, Plus, Trash2, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

import { AppointmentStatusPill } from '../../shared/components/appointment-status-pill';
import { NO_SHOW_REASONS } from '../constants';
import type { AppointmentActionType, OverviewAppointmentEntry, OverviewSummary } from '../types';

type TodayAppointmentsProps = {
  appointments: OverviewAppointmentEntry[];
  summary: OverviewSummary;
  isLoading: boolean;
  errorMessage: string | null;
  onCreateAppointment: () => void;
  onAction: (action: AppointmentActionType, appointmentId: string, detail?: string) => Promise<void>;
  isProcessingAction?: boolean;
  isRescheduling?: boolean;
};

export const TodayAppointments = ({
  appointments,
  summary,
  isLoading,
  errorMessage,
  onCreateAppointment,
  onAction,
  isProcessingAction = false,
  isRescheduling = false,
}: TodayAppointmentsProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionInFlight, setActionInFlight] = useState<string | null>(null);
  const [actionInFlightType, setActionInFlightType] = useState<AppointmentActionType | null>(null);

  const counts = useMemo(
    () => ({
      confirmadas: summary.confirmadas,
      asistidas: summary.asistidas,
      no_asistidas: summary.no_asistidas,
      canceladas: summary.canceladas,
    }),
    [summary]
  );

  const toggleExpanded = (id: string) => {
    setExpandedId((current) => (current === id ? null : id));
  };

  const handleKeyToggle = (event: React.KeyboardEvent<HTMLDivElement>, id: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleExpanded(id);
    }
  };

  const handleAction = async (action: AppointmentActionType, appointmentId: string, detail?: string) => {
    if (isProcessingAction || isRescheduling) return;
    try {
      setActionInFlight(appointmentId);
      setActionInFlightType(action);
      await onAction(action, appointmentId, detail);
      setExpandedId(null);
    } finally {
      setActionInFlight(null);
      setActionInFlightType(null);
    }
  };

  return (
    <Card className="flex h-full flex-col border border-border/50 bg-card p-5 shadow-lg font-sans">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-semibold text-foreground">Citas de hoy</h2>
          <div className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground sm:text-sm">
            <span className="font-medium text-foreground">
              {appointments.length} {appointments.length === 1 ? 'cita programada' : 'citas programadas'}
            </span>
            <div className="flex flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-400/10 px-2 py-0.5 text-[11px] font-medium text-amber-500">
                {counts.confirmadas} pendientes
              </span>
              {counts.asistidas > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-400/10 px-2 py-0.5 text-[11px] font-medium text-emerald-500">
                  {counts.asistidas} asistidas
                </span>
              ) : null}
              {counts.no_asistidas > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-red-400/10 px-2 py-0.5 text-[11px] font-medium text-red-500">
                  {counts.no_asistidas} no asistidas
                </span>
              ) : null}
              {counts.canceladas > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-rose-400/10 px-2 py-0.5 text-[11px] font-medium text-rose-500">
                  {counts.canceladas} canceladas
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <Button variant="primaryAction" onClick={onCreateAppointment}>
          <Plus className="h-4 w-4" />
          Crear cita
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">
          Cargando agenda...
        </div>
      ) : errorMessage ? (
        <div className="flex flex-1 items-center justify-center rounded-lg bg-destructive/10 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : (
        <div className="flex-1 space-y-3 overflow-y-auto">
          {appointments.length === 0 ? (
            <div className="flex h-full min-h-[160px] flex-col items-center justify-center rounded-lg border border-dashed border-border/60 bg-secondary/30 p-6 text-center text-sm text-muted-foreground">
              <p className="font-medium text-foreground">No tienes citas programadas hoy.</p>
              <p className="mt-1 text-xs">
                Aprovecha para contactar con tus clientes o preparar tus próximos servicios.
              </p>
            </div>
          ) : (
            appointments.map((appointment, index) => {
              const isExpanded = expandedId === appointment.id;
              const isBusy = isProcessingAction || actionInFlight === appointment.id;
              const busyAction = actionInFlight === appointment.id ? actionInFlightType : null;
              return (
                <div
                  key={appointment.id}
                  className={cn(
                    'w-full rounded-lg border border-border/30 bg-secondary/30 p-4 transition-all duration-200',
                    'hover:-translate-y-0.5 hover:bg-secondary/50',
                    isExpanded ? 'ring-2 ring-accent' : '',
                    'animate-in fade-in slide-in-from-left-2'
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleExpanded(appointment.id)}
                    onKeyDown={(event) => handleKeyToggle(event, appointment.id)}
                    className="flex items-start justify-between gap-4 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        <span className="font-semibold">{appointment.time}</span>
                      </div>
                      <h3 className="mb-1 text-lg font-semibold text-foreground">{appointment.client}</h3>
                      <p className="text-sm text-muted-foreground">{appointment.service}</p>
                      {appointment.notes ? (
                        <p className="mt-1 text-xs italic text-muted-foreground/80">{appointment.notes}</p>
                      ) : null}
                    </div>
                    <AppointmentStatusPill status={appointment.status} />
                  </div>

                  {isExpanded && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-3">
                      {appointment.status !== 'cancelada' && (
                        <>
                          <Button
                            size="sm"
                            variant="primaryAction"
                            className="min-w-[130px]"
                            disabled={isBusy}
                            onClick={() => void handleAction('attended', appointment.id)}
                          >
                            {busyAction === 'attended' ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                            <span>Asistida</span>
                          </Button>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                            <Button
                              size="sm"
                              variant="outline"
                              className="min-w-[130px]"
                              disabled={isBusy || isRescheduling}
                              onClick={() => void handleAction('reschedule', appointment.id)}
                            >
                              {busyAction === 'reschedule' || isRescheduling ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <CalendarClock className="h-3.5 w-3.5" />
                              )}
                              <span>Mover</span>
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild disabled={isBusy}>
                                <Button size="sm" variant="outline" className="min-w-[130px] justify-between">
                                  <span className="flex items-center gap-2">
                                    {busyAction === 'no-show' ? (
                                      <Loader2 className="size-4 animate-spin" />
                                    ) : (
                                      <XCircle className="h-3.5 w-3.5" />
                                    )}
                                    No asistió
                                  </span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-60">
                                <DropdownMenuItem onSelect={() => void handleAction('no-show', appointment.id)}>
                                  Marcar sin motivo
                                </DropdownMenuItem>
                                {NO_SHOW_REASONS.map((option) => (
                                  <DropdownMenuItem
                                    key={option.value}
                                    onSelect={() => void handleAction('no-show', appointment.id, option.label)}
                                  >
                                    {option.label}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <Button
                              size="sm"
                              variant="outline"
                              className="min-w-[130px] border-destructive/60 text-destructive"
                              disabled={isBusy}
                              onClick={() => void handleAction('cancel', appointment.id)}
                            >
                              {busyAction === 'cancel' ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                              <span>Cancelar</span>
                            </Button>
                          </div>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="min-w-[130px] border-destructive/60 text-destructive hover:bg-destructive/10"
                        disabled={isBusy}
                        onClick={() => void handleAction('delete', appointment.id)}
                      >
                        {busyAction === 'delete' ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        <span>Eliminar</span>
                      </Button>
                      {isBusy && (
                        <span className="text-[11px] text-muted-foreground" aria-live="polite">
                          Procesando acción…
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </Card>
  );
};

export default TodayAppointments;
