import { Loader2 } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

import { STATUS_RING_STYLES } from '../constants';
import type { OverviewAppointmentEntry, OverviewSummary } from '../types';

interface AppointmentsCardProps {
  appointments: OverviewAppointmentEntry[];
  summary: OverviewSummary;
  isLoading: boolean;
  errorMessage: string | null;
  height: number | null;
  onSelectAppointment: (id: string) => void;
}

export const AppointmentsCard = ({
  appointments,
  summary,
  isLoading,
  errorMessage,
  height,
  onSelectAppointment,
}: AppointmentsCardProps) => {
  const style = height ? { height: `${height}px` } : undefined;

  return (
    <Card className="flex flex-col overflow-hidden rounded-2xl ring-1 ring-white/10 bg-white/5 p-6 shadow-sm" style={style}>
      <CardHeader className="p-0">
        <CardTitle className="text-lg font-semibold text-white">Citas de hoy</CardTitle>
        <CardDescription className="text-sm text-white/70">
          Haz clic en cualquier reserva para ver más detalles (próximamente).
        </CardDescription>
      </CardHeader>
      <CardContent className="mt-6 flex flex-1 min-h-0 overflow-hidden p-0">
        {isLoading ? (
          <div className="flex h-full min-h-[220px] flex-1 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/5 text-sm text-white/70">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Cargando agenda de hoy...
          </div>
        ) : errorMessage && appointments.length === 0 ? (
          <div className="flex h-full min-h-[220px] flex-1 items-center justify-center rounded-2xl border border-dashed border-rose-400/25 bg-rose-400/5 px-4 text-center text-sm text-rose-50/80">
            <p>{errorMessage}</p>
          </div>
        ) : summary.total > 0 ? (
          <ScrollArea className="flex-1 h-full min-h-0" type="auto">
            <div className="flex h-full min-h-0 flex-col">
              <div className="grid flex-1 content-start gap-3 py-2 sm:grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3">
                {appointments.map((appointment) => (
                  <button
                    key={appointment.id}
                    type="button"
                    onClick={() => onSelectAppointment(appointment.id)}
                    className="flex w-full flex-col gap-2 rounded-xl border border-white/10 bg-white/0 px-4 py-3 text-left transition hover:border-white/20 hover:bg-white/5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-white/80">
                      <span className="font-medium tabular-nums text-white/90">{appointment.time}</span>
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ${STATUS_RING_STYLES[appointment.status]}`}>
                        {appointment.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-white/70">
                      <span className="font-semibold text-white">{appointment.client}</span>
                      <span className="hidden text-white/40 sm:inline">•</span>
                      <span>{appointment.service}</span>
                    </div>
                  </button>
                ))}
              </div>
              <div className={`${appointments.length ? 'mt-6' : 'mt-4'} pb-4 pt-2`}>
                <p className="rounded-xl border border-dashed border-emerald-400/25 bg-emerald-400/5 px-4 py-3 text-center text-sm text-emerald-50/80">
                  No hay más citas previstas para hoy. ¡Disfruta el cierre del día!
                </p>
              </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="flex min-h-[220px] flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/5 text-center text-sm text-white/70">
            <p>Este día está libre. Crea una nueva cita o marca un hueco disponible.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AppointmentsCard;
