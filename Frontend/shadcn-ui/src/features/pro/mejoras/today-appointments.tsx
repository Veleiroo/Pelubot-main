import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Plus } from 'lucide-react';

const appointments = [
  {
    time: '09:30',
    client: 'Laura Pérez',
    service: 'Corte y peinado',
    status: 'confirmada',
  },
  {
    time: '11:30',
    client: 'Marta López',
    service: 'Coloración parcial',
    status: 'pendiente',
  },
  {
    time: '13:30',
    client: 'Andrea Vidal',
    service: 'Tratamiento hidratante',
    status: 'confirmada',
  },
  {
    time: '15:30',
    client: 'Sara Núñez',
    service: 'Recogido evento',
    status: 'cancelada',
  },
] as const;

const statusConfig = {
  confirmada: { label: 'Confirmada', dotColor: 'bg-accent', textColor: 'text-accent' },
  pendiente: { label: 'Pendiente', dotColor: 'bg-yellow-500', textColor: 'text-yellow-500' },
  cancelada: { label: 'Cancelada', dotColor: 'bg-destructive', textColor: 'text-destructive' },
} as const;

const cn = (...classes: string[]) => classes.filter(Boolean).join(' ');

type TodayAppointmentsProps = {
  onNewAppointment: () => void;
};

export const TodayAppointments = ({ onNewAppointment }: TodayAppointmentsProps) => {
  const confirmedCount = appointments.filter((a) => a.status === 'confirmada').length;
  const pendingCount = appointments.filter((a) => a.status === 'pendiente').length;

  return (
    <Card className="flex h-full flex-col border border-border/50 bg-card p-4 shadow-lg">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Citas de hoy</h2>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{appointments.length} citas</span>
            <span>•</span>
            <span className="text-accent">{confirmedCount} confirmadas</span>
            <span>•</span>
            <span className="text-yellow-500">{pendingCount} pendientes</span>
          </div>
        </div>
        <Button size="sm" onClick={onNewAppointment} className="h-8 text-xs">
          <Plus className="mr-1 h-3.5 w-3.5" />
          Crear cita
        </Button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto">
        {appointments.map((apt, index) => {
          const config = statusConfig[apt.status as keyof typeof statusConfig];
          return (
            <div
              key={apt.time}
              className="animate-in fade-in slide-in-from-left-2 cursor-pointer border border-border/30 bg-secondary/30 p-3 transition-all duration-200 hover:bg-secondary/50"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground">{apt.time}</span>
                  </div>
                  <h3 className="text-base font-bold text-foreground">{apt.client}</h3>
                  <p className="text-xs text-muted-foreground">{apt.service}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={cn('h-1.5 w-1.5 rounded-full', config.dotColor)} />
                  <span className={cn('text-xs font-medium', config.textColor)}>{config.label}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default TodayAppointments;
