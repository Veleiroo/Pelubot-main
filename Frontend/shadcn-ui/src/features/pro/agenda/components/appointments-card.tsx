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
    return (
      <div ref={ref} className="space-y-6">
        {/* Header estilo Marina - Responsive */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-foreground mb-2">{dayLabel}</h1>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-foreground font-medium">
                {summary.total > 0
                  ? `${summary.total} ${summary.total === 1 ? 'cita' : 'citas'}`
                  : 'Sin citas'}
              </span>
              {summary.pendientes > 0 && (
                <Badge variant="secondary" className="gap-1.5 bg-muted text-foreground">
                  <Clock className="h-3 w-3" />
                  {summary.pendientes}
                </Badge>
              )}
            </div>
          </div>
          <Button 
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto"
            onClick={onCreate}
          >
            <Plus className="h-4 w-4" />
            Crear cita
          </Button>
        </div>

        {/* Appointments estilo Marina */}
        <div className="space-y-4">
          {appointments.length > 0 ? (
            appointments.map((appointment) => {
              const contact = contactLabel(appointment);
              
              return (
                <Card
                  key={appointment.id}
                  className="p-6 border-l-4 border-l-warning bg-card border-border/50 hover:shadow-xl hover:shadow-warning/5 transition-all hover:border-border"
                >
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="space-y-3 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {timeRangeLabel(appointment)}
                          </div>
                          <Badge variant="outline" className="bg-warning/15 text-warning border-warning/30">
                            {appointment.status === 'pendiente' ? 'PENDIENTE' : 
                             appointment.status === 'confirmada' ? 'CONFIRMADA' : 'CANCELADA'}
                          </Badge>
                        </div>

                        <div>
                          <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-1">{appointment.client}</h3>
                          <p className="text-muted-foreground">{appointment.service}</p>
                        </div>

                        {contact && (
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
                            {contact.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4" />
                                {contact.phone}
                              </div>
                            )}
                            {contact.email && (
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4" />
                                {contact.email}
                              </div>
                            )}
                          </div>
                        )}

                        {appointment.notes && (
                          <div className="flex items-center gap-2 pt-2">
                            <input
                              type="checkbox"
                              id={`confirm-${appointment.id}`}
                              className="rounded border-border bg-muted"
                            />
                            <label
                              htmlFor={`confirm-${appointment.id}`}
                              className="text-sm text-muted-foreground cursor-pointer"
                            >
                              {appointment.notes}
                            </label>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 border-border/50 hover:bg-muted hover:border-primary/50 bg-transparent"
                          onClick={() => onAction('reschedule', appointment)}
                        >
                          <Calendar className="h-4 w-4" />
                          <span className="hidden sm:inline">Reprog.</span>
                          <span className="sm:hidden">Reprogramar</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 text-destructive hover:text-destructive border-border/50 hover:bg-destructive/10 hover:border-destructive/50 bg-transparent"
                          onClick={() => onAction('cancel', appointment)}
                        >
                          <X className="h-4 w-4" />
                          <span className="hidden sm:inline">Cancel.</span>
                          <span className="sm:hidden">Cancelar</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          ) : (
            <div className="flex h-full min-h-[240px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/30 bg-muted/30 text-center">
              <div className="space-y-2 p-6">
                <p className="text-4xl">📅</p>
                <p className="text-lg font-semibold text-foreground">Día libre</p>
                <p className="text-sm text-muted-foreground">Este día no tiene citas programadas</p>
                <p className="text-xs text-muted-foreground">Haz clic en "Crear cita" para agregar una nueva</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);

AppointmentsCard.displayName = 'AgendaAppointmentsCard';
