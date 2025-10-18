import { useMemo } from 'react';
import { Clock, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

import type { OverviewAppointmentEntry, OverviewSummary } from '../types';

type TodayAppointmentsProps = {
  appointments: OverviewAppointmentEntry[];
  summary: OverviewSummary;
  isLoading: boolean;
  errorMessage: string | null;
  onSelectAppointment: (id: string) => void;
  onCreateAppointment: () => void;
};

const STATUS_LABEL: Record<OverviewAppointmentEntry['status'], { label: string; dot: string; text: string }> = {
  confirmada: { label: 'Confirmada', dot: 'bg-accent', text: 'text-accent' },
  pendiente: { label: 'Pendiente', dot: 'bg-yellow-500', text: 'text-yellow-500' },
  cancelada: { label: 'Cancelada', dot: 'bg-destructive', text: 'text-destructive' },
};

export const TodayAppointments = ({
  appointments,
  summary,
  isLoading,
  errorMessage,
  onSelectAppointment,
  onCreateAppointment,
}: TodayAppointmentsProps) => {
  const counts = useMemo(
    () => ({
      confirmadas: summary.confirmadas,
      pendientes: summary.pendientes,
      canceladas: summary.canceladas,
    }),
    [summary]
  );

  return (
    <Card className="flex h-full flex-col border border-border/50 bg-card p-4 shadow-lg">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Citas de hoy</h2>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              {appointments.length} {appointments.length === 1 ? 'cita' : 'citas'}
            </span>
            <span>•</span>
            <span className="text-accent">{counts.confirmadas} confirmadas</span>
            <span>•</span>
            <span className="text-yellow-500">{counts.pendientes} pendientes</span>
          </div>
        </div>
        <Button size="sm" onClick={onCreateAppointment} className="h-8 text-xs">
          <Plus className="mr-1 h-3.5 w-3.5" />
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
          {appointments.map((appointment, index) => {
            const config = STATUS_LABEL[appointment.status];
            return (
              <button
                key={appointment.id}
                type="button"
                onClick={() => onSelectAppointment(appointment.id)}
                className="w-full cursor-pointer border border-border/30 bg-secondary/30 p-3 text-left transition hover:bg-secondary/50"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      <span className="font-semibold">{appointment.time}</span>
                    </div>
                    <h3 className="mb-1 text-base font-bold text-foreground">{appointment.client}</h3>
                    <p className="text-xs text-muted-foreground">{appointment.service}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
                    <span className={`text-xs font-medium ${config.text}`}>{config.label}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
};

export default TodayAppointments;
