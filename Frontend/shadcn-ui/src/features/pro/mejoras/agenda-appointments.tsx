import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CalendarIcon, Clock, Filter, Mail, Phone, Plus, Trash2 } from 'lucide-react';

const appointments = [
  {
    time: '09:00 - 09:45',
    status: 'CONFIRMADA',
    client: 'Cliente 31',
    service: 'Corte de cabello clásico',
    phone: '+34 600 000 000',
    email: 'cliente31@pelubot.mock',
    serviceType: 'corte',
  },
  {
    time: '11:30 - 12:15',
    status: 'CONFIRMADA',
    client: 'Cliente 32',
    service: 'Arreglo de barba premium',
    phone: '+34 600 000 000',
    email: 'cliente32@pelubot.mock',
    serviceType: 'barba',
  },
  {
    time: '13:00 - 13:30',
    status: 'PENDIENTE',
    client: 'Cliente 33',
    service: 'Corte y peinado',
    phone: '+34 600 000 001',
    email: 'cliente33@pelubot.mock',
    serviceType: 'corte',
  },
  {
    time: '15:00 - 15:45',
    status: 'CONFIRMADA',
    client: 'Cliente 34',
    service: 'Tratamiento capilar',
    phone: '+34 600 000 002',
    email: 'cliente34@pelubot.mock',
    serviceType: 'tratamiento',
  },
  {
    time: '16:30 - 17:00',
    status: 'PENDIENTE',
    client: 'Cliente 35',
    service: 'Corte básico',
    phone: '+34 600 000 003',
    email: 'cliente35@pelubot.mock',
    serviceType: 'corte',
  },
  {
    time: '18:00 - 18:45',
    status: 'CONFIRMADA',
    client: 'Cliente 36',
    service: 'Coloración completa',
    phone: '+34 600 000 004',
    email: 'cliente36@pelubot.mock',
    serviceType: 'color',
  },
] as const;

const cn = (...classes: string[]) => classes.filter(Boolean).join(' ');

const getServiceTypeColor = (serviceType: string) => {
  switch (serviceType) {
    case 'corte':
      return 'border-l-accent';
    case 'barba':
      return 'border-l-blue-500';
    case 'color':
      return 'border-l-purple-500';
    case 'tratamiento':
      return 'border-l-green-500';
    default:
      return 'border-l-border';
  }
};

const StatusBadge = ({ status }: { status: string }) => {
  const config =
    status === 'CONFIRMADA'
      ? { color: 'bg-accent', label: 'Confirmada' }
      : status === 'PENDIENTE'
        ? { color: 'bg-yellow-500', label: 'Pendiente' }
        : { color: 'bg-destructive', label: 'Cancelada' };

  return (
    <div className="flex items-center gap-2 rounded-full border border-border/50 bg-secondary/50 px-3 py-1.5 text-xs font-medium transition hover:bg-secondary">
      <div className={`h-2 w-2 rounded-full ${config.color} animate-pulse`} />
      <span>{config.label}</span>
    </div>
  );
};

export const AgendaAppointments = () => {
  const [filter, setFilter] = useState<'all' | 'confirmada' | 'pendiente'>('all');

  const filteredAppointments = appointments.filter((appointment) => {
    if (filter === 'all') return true;
    return appointment.status === filter.toUpperCase();
  });

  const confirmadasCount = appointments.filter((appointment) => appointment.status === 'CONFIRMADA').length;
  const pendientesCount = appointments.filter((appointment) => appointment.status === 'PENDIENTE').length;
  const canceladasCount = appointments.filter((appointment) => appointment.status === 'CANCELADA').length;

  return (
    <div className="flex h-full flex-col gap-4">
      <Card className="flex-shrink-0 border border-border/50 bg-card p-5 shadow-lg">
        <div className="mb-0 flex items-center justify-between">
          <div>
            <h2 className="mb-1 text-2xl font-bold text-foreground">Martes 14 De Octubre</h2>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{filteredAppointments.length} citas</span>
              <span>•</span>
              <span className="text-accent font-medium">{confirmadasCount} confirmadas</span>
              <span>•</span>
              <span className="text-yellow-500 font-medium">{pendientesCount} pendientes</span>
              {canceladasCount > 0 ? (
                <>
                  <span>•</span>
                  <span className="text-destructive font-medium">{canceladasCount} canceladas</span>
                </>
              ) : null}
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-9 px-4 border-border bg-transparent transition hover:scale-105 hover:bg-secondary"
          >
            <Plus className="mr-2 h-4 w-4" />
            Crear cita
          </Button>
        </div>

        <div className="flex items-center gap-2 pt-3 text-sm leading-7 text-muted-foreground">
          <Filter className="h-4 w-4" />
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'Todas' },
              { key: 'confirmada', label: 'Confirmadas' },
              { key: 'pendiente', label: 'Pendientes' },
            ].map((item) => (
              <Button
                key={item.key}
                size="sm"
                variant={filter === item.key ? 'default' : 'outline'}
                className={
                  filter === item.key ? 'h-8 bg-accent hover:bg-accent/90' : 'h-8 bg-transparent hover:bg-secondary'
                }
                onClick={() => setFilter(item.key as typeof filter)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      <div className="flex-1 overflow-y-auto pr-2">
        <div className="space-y-3">
          {filteredAppointments.map((appointment, index) => (
            <Card
              key={appointment.client}
              className={cn(
                'animate-in fade-in slide-in-from-left-2 border border-border/30 bg-card p-4 transition hover:bg-secondary/30',
                getServiceTypeColor(appointment.serviceType)
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="mb-0 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="font-semibold">{appointment.time}</span>
                  </div>
                  <h3 className="mb-1 text-xl font-bold text-foreground">{appointment.client}</h3>
                  <p className="text-sm text-muted-foreground">{appointment.service}</p>
                </div>
                <StatusBadge status={appointment.status} />
              </div>

              <div className="flex items-center justify-between gap-6 border-t border-border/30 pt-0 text-sm text-muted-foreground">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 transition-colors hover:text-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{appointment.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 transition-colors hover:text-foreground">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{appointment.email}</span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="ghost" size="sm" className="h-8 px-3 hover:bg-secondary hover:scale-105">
                    <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                    Reprogramar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-3 text-destructive hover:bg-destructive/10 hover:text-destructive hover:scale-105"
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Cancelar
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AgendaAppointments;
