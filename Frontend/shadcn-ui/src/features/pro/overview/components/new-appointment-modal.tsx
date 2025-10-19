import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { api, type Service } from '@/lib/api';

export type NewAppointmentFormValues = {
  client: string;
  clientPhone: string;
  clientEmail?: string;
  date: string;
  time: string;
  serviceId: string;
  serviceName: string;
  durationMinutes: number;
  notes: string;
};

type NewAppointmentModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestedDate?: string | Date | null;
  suggestedService?: string | null;
  services?: Service[];
  servicesLoading?: boolean;
  onConfirm?: (values: NewAppointmentFormValues) => void | Promise<void>;
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
  '18:00',
  '18:30',
  '19:00',
  '19:30',
];

const isPromiseLike = (value: unknown): value is PromiseLike<unknown> =>
  value !== null && typeof value === 'object' && typeof (value as PromiseLike<unknown>).then === 'function';

const formatSuggestedDate = (value?: string | Date | null) => {
  if (!value) return '';
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
};

export const NewAppointmentModal = ({
  open,
  onOpenChange,
  suggestedDate,
  suggestedService,
  services: providedServices,
  servicesLoading,
  onConfirm,
}: NewAppointmentModalProps) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedClientPhone, setSelectedClientPhone] = useState('');
  const [selectedClientEmail, setSelectedClientEmail] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cargar servicios reales del backend
  const shouldFetchServices = typeof providedServices === 'undefined';
  const { data: fetchedServices = [], isLoading: isFetchingServices } = useQuery({
    queryKey: ['services'],
    queryFn: api.getServices,
    staleTime: 5 * 60 * 1000, // 5 minutos
    enabled: shouldFetchServices,
  });

  const services = providedServices ?? fetchedServices;
  const isLoadingServices = servicesLoading ?? (shouldFetchServices ? isFetchingServices : false);

  const selectedService = services.find(s => s.id === selectedServiceId);

  const formattedSuggestedDate = useMemo(() => formatSuggestedDate(suggestedDate), [suggestedDate]);

  useEffect(() => {
    if (open) {
      setSelectedDate(formattedSuggestedDate);
      setSelectedServiceId(current => {
        if (suggestedService) return suggestedService;
        if (current) return current;
        return services[0]?.id ?? '';
      });
      setSelectedClientPhone('');
      setSelectedClientEmail('');
    } else {
      setSelectedTime('');
      setSelectedClient('');
      setSelectedClientPhone('');
      setSelectedClientEmail('');
      setSelectedServiceId('');
      setSelectedDate('');
      setNotes('');
      setIsSubmitting(false);
    }
  }, [open, formattedSuggestedDate, suggestedService, services]);

  const handleClose = () => onOpenChange(false);

  const isConfirmDisabled =
    !selectedClient ||
    !selectedClientPhone ||
    !selectedDate ||
    !selectedTime ||
    !selectedServiceId ||
    !selectedService ||
    isSubmitting;

  const handleConfirm = async () => {
    if (isConfirmDisabled || !selectedService) return;

    const payload: NewAppointmentFormValues = {
      client: selectedClient,
      clientPhone: selectedClientPhone,
      clientEmail: selectedClientEmail || undefined,
      date: selectedDate,
      time: selectedTime,
      serviceId: selectedServiceId,
      serviceName: selectedService.name,
      durationMinutes: selectedService.duration_min,
      notes,
    };

    if (!onConfirm) {
      onOpenChange(false);
      return;
    }

    try {
      const result = onConfirm(payload);
      if (isPromiseLike(result)) {
        setIsSubmitting(true);
        await result;
      }
      onOpenChange(false);
    } catch (error) {
      setIsSubmitting(false);
      return;
    } finally {
      setIsSubmitting(false);
    }
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
              Nombre del cliente *
            </Label>
            <Input
              id="client"
              placeholder="Nombre completo del cliente"
              value={selectedClient}
              onChange={(event) => setSelectedClient(event.target.value)}
              className="border-border bg-secondary/50"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="client-phone" className="flex items-center gap-2 text-sm font-medium">
                <Phone className="h-4 w-4" aria-hidden="true" />
                Teléfono *
              </Label>
              <Input
                id="client-phone"
                type="tel"
                placeholder="+34 600 000 000"
                value={selectedClientPhone}
                onChange={(event) => setSelectedClientPhone(event.target.value)}
                className="border-border bg-secondary/50"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client-email" className="flex items-center gap-2 text-sm font-medium">
                <Mail className="h-4 w-4" aria-hidden="true" />
                Email
              </Label>
              <Input
                id="client-email"
                type="email"
                placeholder="cliente@ejemplo.com"
                value={selectedClientEmail}
                onChange={(event) => setSelectedClientEmail(event.target.value)}
                className="border-border bg-secondary/50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date" className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="h-4 w-4" aria-hidden="true" />
              Fecha *
            </Label>
            <Input
              id="date"
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="border-border bg-secondary/50"
              required
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
              Servicio *
            </Label>
            {isLoadingServices ? (
              <div className="text-sm text-muted-foreground">Cargando servicios...</div>
            ) : services.length === 0 ? (
              <div className="text-sm text-destructive">No hay servicios disponibles</div>
            ) : (
              <div className="space-y-2">
                {services.map((service) => (
                  <Card
                    key={service.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedServiceId(service.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedServiceId(service.id);
                      }
                    }}
                    className={cn(
                      'cursor-pointer border-border bg-secondary/50 p-3 transition-all hover:bg-secondary hover:shadow-md focus:outline-none focus:ring-2 focus:ring-accent',
                      selectedServiceId === service.id && 'border-accent bg-accent/20'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{service.name}</span>
                        <span className="text-xs text-muted-foreground">{service.price_eur}€</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{service.duration_min} min</span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

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
              Crear cita
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
