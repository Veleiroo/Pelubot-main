import { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Clock,
  Mail,
  Phone,
  Scissors,
  User,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type ServiceOption = {
  name: string;
  duration: string;
};

export type NewAppointmentFormValues = {
  client: string;
  date: string;
  time: string;
  service: string;
  notes: string;
};

type NewAppointmentModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestedDate?: string | null;
  suggestedService?: string | null;
  onConfirm?: (values: NewAppointmentFormValues) => void;
};

const AVAILABLE_SLOTS = [
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

const SERVICE_OPTIONS: ServiceOption[] = [
  { name: 'Corte de cabello clásico', duration: '45 min' },
  { name: 'Corte y peinado', duration: '60 min' },
  { name: 'Coloración completa', duration: '120 min' },
  { name: 'Coloración parcial', duration: '90 min' },
  { name: 'Tratamiento hidratante', duration: '45 min' },
  { name: 'Arreglo de barba premium', duration: '30 min' },
  { name: 'Recogido evento', duration: '90 min' },
];

const formatSuggestedDate = (value?: string | null) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
};

export const NewAppointmentModal = ({
  open,
  onOpenChange,
  suggestedDate,
  suggestedService,
  onConfirm,
}: NewAppointmentModalProps) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [notes, setNotes] = useState('');

  const formattedSuggestedDate = useMemo(() => formatSuggestedDate(suggestedDate), [suggestedDate]);

  useEffect(() => {
    if (open) {
      setSelectedDate(formattedSuggestedDate);
      setSelectedService(suggestedService ?? '');
    } else {
      setSelectedTime('');
      setSelectedClient('');
      setSelectedService('');
      setSelectedDate('');
      setNotes('');
    }
  }, [open, formattedSuggestedDate, suggestedService]);

  const handleClose = () => onOpenChange(false);

  const isConfirmDisabled = !selectedClient || !selectedDate || !selectedTime || !selectedService;

  const handleConfirm = () => {
    if (isConfirmDisabled) return;
    onConfirm?.({
      client: selectedClient,
      date: selectedDate,
      time: selectedTime,
      service: selectedService,
      notes,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-border bg-card">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Nueva cita</DialogTitle>
          <DialogDescription>
            Completa los detalles para crear una nueva cita en tu agenda.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="client" className="flex items-center gap-2 text-sm font-medium">
              <User className="h-4 w-4" aria-hidden="true" />
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
            <Label htmlFor="date" className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="h-4 w-4" aria-hidden="true" />
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
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Clock className="h-4 w-4" aria-hidden="true" />
              Horario disponible
            </Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {AVAILABLE_SLOTS.map((slot) => (
                <Button
                  key={slot}
                  type="button"
                  size="sm"
                  variant={selectedTime === slot ? 'default' : 'outline'}
                  onClick={() => setSelectedTime(slot)}
                  className={cn(
                    'bg-secondary/50 text-xs transition',
                    selectedTime === slot ? 'bg-accent text-accent-foreground hover:bg-accent/90' : 'hover:bg-secondary'
                  )}
                >
                  {slot}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Scissors className="h-4 w-4" aria-hidden="true" />
              Servicio
            </Label>
            <div className="space-y-2">
              {SERVICE_OPTIONS.map((service) => (
                <Card
                  key={service.name}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedService(service.name)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelectedService(service.name);
                    }
                  }}
                  className={cn(
                    'cursor-pointer border-border bg-secondary/50 p-3 transition-all hover:bg-secondary hover:shadow-md focus:outline-none focus:ring-2 focus:ring-accent',
                    selectedService === service.name && 'border-accent bg-accent/20'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{service.name}</span>
                    <span className="text-xs text-muted-foreground">{service.duration}</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {selectedClient ? (
            <Card className="border-border bg-secondary/50 p-4">
              <h4 className="mb-3 text-sm font-semibold">Información de contacto</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" aria-hidden="true" />
                  <span>+34 600 000 000</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  <span>cliente@pelubot.mock</span>
                </div>
              </div>
            </Card>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Notas / Observaciones
            </Label>
            <Textarea
              id="notes"
              placeholder="Preferencias del cliente, detalles especiales..."
              className="min-h-[80px] border-border bg-secondary/50"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-3 pt-4 sm:flex-row">
            <Button
              type="button"
              className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
              disabled={isConfirmDisabled}
              onClick={handleConfirm}
            >
              Confirmar cita
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1 bg-transparent hover:bg-secondary"
              onClick={handleClose}
            >
              <X className="mr-2 h-4 w-4" aria-hidden="true" />
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewAppointmentModal;
