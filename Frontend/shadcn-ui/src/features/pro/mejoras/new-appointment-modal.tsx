import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, CalendarClock, Mail, Phone, Scissors, User, X } from 'lucide-react';

const cn = (...classes: string[]) => classes.filter(Boolean).join(' ');

type NewAppointmentModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const availableSlots = [
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '12:30',
  '13:00',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
  '17:30',
];

const services = [
  { name: 'Corte de cabello clásico', duration: '45 min' },
  { name: 'Corte y peinado', duration: '60 min' },
  { name: 'Coloración completa', duration: '120 min' },
  { name: 'Coloración parcial', duration: '90 min' },
  { name: 'Tratamiento hidratante', duration: '45 min' },
  { name: 'Arreglo de barba premium', duration: '30 min' },
  { name: 'Recogido evento', duration: '90 min' },
];

export const NewAppointmentModal = ({ open, onOpenChange }: NewAppointmentModalProps) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedService, setSelectedService] = useState('');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-border bg-card">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground">Nueva cita</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Completa los detalles para crear una nueva cita en tu agenda.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="client" className="flex items-center gap-2 text-sm font-medium text-foreground">
              <User className="h-4 w-4" />
              Cliente
            </Label>
            <Input
              id="client"
              placeholder="Buscar cliente o añadir nuevo..."
              value={selectedClient}
              onChange={(event) => setSelectedClient(event.target.value)}
              className="border-border bg-secondary/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date" className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Calendar className="h-4 w-4" />
              Fecha
            </Label>
            <Input
              id="date"
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="border-border bg-secondary/50"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <CalendarClock className="h-4 w-4" />
              Horario disponible
            </Label>
            <div className="grid grid-cols-6 gap-2">
              {availableSlots.map((slot) => (
                <Button
                  key={slot}
                  variant={selectedTime === slot ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTime(slot)}
                  className={
                    selectedTime === slot
                      ? 'bg-accent text-accent-foreground hover:bg-accent/90'
                      : 'border-border bg-secondary/50 hover:bg-secondary'
                  }
                >
                  {slot}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Scissors className="h-4 w-4" />
              Servicio
            </Label>
            <div className="space-y-2">
              {services.map((service) => (
                <Card
                  key={service.name}
                  className={cn(
                    'cursor-pointer border transition-all hover:shadow-md',
                    selectedService === service.name
                      ? 'border-accent bg-accent/20'
                      : 'border-border bg-secondary/50 hover:bg-secondary',
                  )}
                  onClick={() => setSelectedService(service.name)}
                >
                  <div className="flex items-center justify-between p-3">
                    <span className="text-sm font-medium text-foreground">{service.name}</span>
                    <span className="text-xs text-muted-foreground">{service.duration}</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {selectedClient ? (
            <Card className="border-border bg-secondary/50 p-4">
              <h4 className="mb-3 text-sm font-semibold text-foreground">Información de contacto</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span>+34 600 000 000</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>cliente@pelubot.mock</span>
                </div>
              </div>
            </Card>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium text-foreground">
              Notas / Observaciones
            </Label>
            <Textarea
              id="notes"
              placeholder="Preferencias del cliente, detalles especiales..."
              className="min-h-[80px] border-border bg-secondary/50"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
              disabled={!selectedClient || !selectedDate || !selectedTime || !selectedService}
            >
              Confirmar cita
            </Button>
            <Button
              variant="outline"
              className="border-border bg-transparent hover:bg-secondary"
              onClick={() => onOpenChange(false)}
            >
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewAppointmentModal;
