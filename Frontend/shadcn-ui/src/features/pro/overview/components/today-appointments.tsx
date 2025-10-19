import { useMemo, useState } from 'react';
import { CheckCircle2, Clock, Plus, Trash2, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import type { AppointmentActionType, OverviewAppointmentEntry, OverviewSummary } from '../types';

type TodayAppointmentsProps = {
  appointments: OverviewAppointmentEntry[];
  summary: OverviewSummary;
  isLoading: boolean;
  errorMessage: string | null;
  onCreateAppointment: () => void;
  onAction: (action: AppointmentActionType, appointmentId: string, detail?: string) => Promise<void>;
  isProcessingAction?: boolean;
};

const STATUS_LABEL: Record<OverviewAppointmentEntry['status'], { label: string; dot: string; text: string }> = {
  confirmada: { label: 'Pendiente', dot: 'bg-amber-500', text: 'text-amber-500' },
  asistida: { label: 'Asistida', dot: 'bg-emerald-600', text: 'text-emerald-600' },
  no_asistida: { label: 'No asistida', dot: 'bg-red-500', text: 'text-red-500' },
  cancelada: { label: 'Cancelada', dot: 'bg-rose-500', text: 'text-rose-500' },
};

export const TodayAppointments = ({
  appointments,
  summary,
  isLoading,
  errorMessage,
  onCreateAppointment,
  onAction,
  isProcessingAction = false,
}: TodayAppointmentsProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionInFlight, setActionInFlight] = useState<string | null>(null);

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

  const handleAction = async (action: AppointmentActionType, appointmentId: string) => {
    if (isProcessingAction) return;
    try {
      setActionInFlight(appointmentId);
      let detail: string | undefined;
      if (action === 'no-show') {
        const reason = window.prompt('Motivo del no-show (opcional)');
        detail = reason ? reason.trim() || undefined : undefined;
      }
      await onAction(action, appointmentId, detail);
      setExpandedId(null);
    } finally {
      setActionInFlight(null);
    }
  };

  return (
    <Card className="flex h-full flex-col border border-border/50 bg-card p-5 shadow-lg font-sans">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-semibold text-foreground">Citas de hoy</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-base text-muted-foreground">
            <span>
              {appointments.length} {appointments.length === 1 ? 'cita' : 'citas'}
            </span>
            <span>•</span>
            <span className="text-amber-500">{counts.confirmadas} pendientes</span>
            {counts.asistidas > 0 && (
              <>
                <span>•</span>
                <span className="text-emerald-600">{counts.asistidas} asistidas</span>
              </>
            )}
            {counts.no_asistidas > 0 && (
              <>
                <span>•</span>
                <span className="text-red-500">{counts.no_asistidas} no asistidas</span>
              </>
            )}
            {counts.canceladas > 0 && (
              <>
                <span>•</span>
                <span className="text-destructive">{counts.canceladas} canceladas</span>
              </>
            )}
          </div>
        </div>
        <Button size="sm" onClick={onCreateAppointment} className="h-9 rounded-full px-4 text-sm font-semibold">
          <Plus className="mr-2 h-4 w-4" />
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
              const config = STATUS_LABEL[appointment.status];
              const isExpanded = expandedId === appointment.id;
              const isBusy = isProcessingAction || actionInFlight === appointment.id;
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
                    <div className="flex items-center gap-1.5">
                      <span className={cn('h-1.5 w-1.5 rounded-full', config.dot)} />
                      <span className={cn('text-xs font-medium', config.text)}>{config.label}</span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {appointment.status !== 'cancelada' && (
                        <>
                          <Button
                            size="sm"
                            className="inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-semibold bg-emerald-500 text-emerald-950 shadow-sm hover:bg-emerald-400"
                            disabled={isBusy}
                            onClick={() => handleAction('attended', appointment.id)}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Asistida
                          </Button>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="inline-flex h-9 items-center gap-2 rounded-full border-amber-400/70 px-4 text-sm font-semibold text-amber-500 hover:bg-amber-500/10"
                              disabled={isBusy}
                              onClick={() => handleAction('no-show', appointment.id)}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              No asistió
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="inline-flex h-9 items-center gap-2 rounded-full border-destructive/70 px-4 text-sm font-semibold text-destructive hover:bg-destructive/10"
                              disabled={isBusy}
                              onClick={() => handleAction('cancel', appointment.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Cancelar
                            </Button>
                          </div>
                        </>
                      )}
                      <Button
                        size="sm"
                        className="inline-flex h-9 items-center gap-2 rounded-full bg-red-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-red-500"
                        disabled={isBusy}
                        onClick={() => handleAction('delete', appointment.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Eliminar
                      </Button>
                      {isBusy && (
                        <span className="text-[11px] text-muted-foreground">Procesando acción…</span>
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
