import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Mail, Phone, CalendarIcon, Trash2, Plus, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { STATUS_LABELS } from '../../shared/constants';
import type { Appointment, AppointmentStatus } from '../../shared/types';

function getServiceTypeColor(serviceId?: string): string {
  if (!serviceId) return 'border-l-border';
  
  const serviceLower = serviceId.toLowerCase();
  if (serviceLower.includes('corte')) return 'border-l-accent';
  if (serviceLower.includes('barba')) return 'border-l-blue-500';
  if (serviceLower.includes('color')) return 'border-l-purple-500';
  if (serviceLower.includes('tratamiento')) return 'border-l-green-500';
  
  return 'border-l-border';
}

const STATUS_DOTS: Record<AppointmentStatus, string> = {
  confirmada: 'bg-amber-500',
  asistida: 'bg-emerald-600',
  no_asistida: 'bg-red-500',
  cancelada: 'bg-rose-500',
};

function StatusBadge({ status }: { status: AppointmentStatus }) {
  const color = STATUS_DOTS[status] ?? 'bg-muted-foreground';
  const label = STATUS_LABELS[status] ?? status;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border/50 transition-all hover:bg-secondary">
      <div className={`w-2 h-2 rounded-full ${color} animate-pulse`} />
      <span className="text-xs font-medium capitalize">{label}</span>
    </div>
  );
}

interface AgendaAppointmentsProps {
  appointments: Appointment[];
  selectedDate: Date;
  onCreateAppointment?: () => void;
  onRescheduleAppointment?: (id: string) => void;
  onCancelAppointment?: (id: string) => void;
}

export function AgendaAppointments({
  appointments,
  selectedDate,
  onCreateAppointment,
  onRescheduleAppointment,
  onCancelAppointment,
}: AgendaAppointmentsProps) {
  const [filter, setFilter] = useState<'all' | AppointmentStatus>('all');

  const filteredAppointments = appointments.filter((apt) => {
    if (filter === 'all') return true;
    return apt.status === filter;
  });

  const confirmadasCount = appointments.filter((a) => a.status === 'confirmada').length;
  const asistidasCount = appointments.filter((a) => a.status === 'asistida').length;
  const noAsistidasCount = appointments.filter((a) => a.status === 'no_asistida').length;
  const canceladasCount = appointments.filter((a) => a.status === 'cancelada').length;

  const formattedDate = format(selectedDate, "EEEE d 'de' MMMM", { locale: es });
  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  return (
    <div className="flex flex-col h-full gap-4">
      <Card className="p-5 bg-card border-border/50 flex-shrink-0 shadow-lg px-5">
        <div className="flex items-center justify-between mb-0">
          <div>
            <h2 className="text-2xl font-bold mb-1">{capitalizedDate}</h2>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="font-medium">{filteredAppointments.length} citas</span>
              {confirmadasCount > 0 && (
                <>
                  <span>•</span>
                  <span className="text-amber-600 font-medium">{confirmadasCount} pendientes</span>
                </>
              )}
              {asistidasCount > 0 && (
                <>
                  <span>•</span>
                  <span className="text-emerald-600 font-medium">{asistidasCount} asistidas</span>
                </>
              )}
              {noAsistidasCount > 0 && (
                <>
                  <span>•</span>
                  <span className="text-red-500 font-medium">{noAsistidasCount} no asistidas</span>
                </>
              )}
              {canceladasCount > 0 && (
                <>
                  <span>•</span>
                  <span className="text-destructive font-medium">{canceladasCount} canceladas</span>
                </>
              )}
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="bg-transparent hover:bg-secondary hover:scale-105 transition-all h-9 px-4"
            onClick={onCreateAppointment}
          >
            <Plus className="w-4 h-4 mr-2" />
            Crear cita
          </Button>
        </div>

        <div className="flex items-center gap-2 leading-7">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
              className={cn(
                filter === 'all' ? 'bg-accent hover:bg-accent/90 h-8' : 'bg-transparent hover:bg-secondary h-8'
              )}
            >
              Todas
            </Button>
            <Button
              size="sm"
              variant={filter === 'confirmada' ? 'default' : 'outline'}
              onClick={() => setFilter('confirmada')}
              className={cn(
                filter === 'confirmada' ? 'bg-accent hover:bg-accent/90 h-8' : 'bg-transparent hover:bg-secondary h-8'
              )}
            >
              Pendientes
            </Button>
            <Button
              size="sm"
              variant={filter === 'asistida' ? 'default' : 'outline'}
              onClick={() => setFilter('asistida')}
              className={cn(
                filter === 'asistida' ? 'bg-accent hover:bg-accent/90 h-8' : 'bg-transparent hover:bg-secondary h-8'
              )}
            >
              Asistidas
            </Button>
          </div>
        </div>
      </Card>

      <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        {filteredAppointments.length === 0 ? (
          <Card className="p-8 bg-card border-border/50 text-center">
            <p className="text-muted-foreground">No hay citas para este día</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredAppointments.map((apt, idx) => (
              <Card
                key={apt.id}
                className={cn(
                  'p-4 border-l-4 bg-card border-r border-t border-b border-border/30 hover:bg-secondary/30 hover:shadow-lg transition-all duration-200 animate-in fade-in slide-in-from-left-2',
                  getServiceTypeColor(apt.serviceId)
                )}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex items-start justify-between gap-4 mb-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-sm font-semibold text-muted-foreground">
                        {apt.time}
                        {apt.endTime && ` - ${apt.endTime}`}
                        {!apt.endTime && apt.durationMinutes && ` (${apt.durationMinutes}min)`}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold mb-1">{apt.client}</h3>
                    <p className="text-sm text-muted-foreground">{apt.service}</p>
                  </div>
                  <StatusBadge status={apt.status} />
                </div>

                <div className="flex items-center justify-between gap-6 border-t border-border/30 pt-0">
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    {apt.clientPhone && (
                      <div className="flex items-center gap-2 hover:text-foreground transition-colors">
                        <Phone className="w-4 h-4" />
                        <span>{apt.clientPhone}</span>
                      </div>
                    )}
                    {apt.clientEmail && (
                      <div className="flex items-center gap-2 hover:text-foreground transition-colors">
                        <Mail className="w-4 h-4" />
                        <span className="truncate">{apt.clientEmail}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-3 hover:bg-secondary hover:scale-105 transition-all"
                      onClick={() => onRescheduleAppointment?.(apt.id)}
                    >
                      <CalendarIcon className="w-3.5 h-3.5 mr-1.5" />
                      Reprogramar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-3 text-destructive hover:text-destructive hover:bg-destructive/10 hover:scale-105 transition-all"
                      onClick={() => onCancelAppointment?.(apt.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      Cancelar
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
