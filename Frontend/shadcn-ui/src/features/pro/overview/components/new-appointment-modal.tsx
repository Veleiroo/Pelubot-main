import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar,
  Clock,
  Loader2,
  Phone,
  Scissors,
  User,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { api, type Service } from '@/lib/api';
import { format } from 'date-fns';

export type NewAppointmentFormValues = {
  client: string;
  clientPhone: string;
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
  professionalId?: string | null;
};

const isPromiseLike = (value: unknown): value is PromiseLike<unknown> =>
  value !== null && typeof value === 'object' && typeof (value as PromiseLike<unknown>).then === 'function';

const formatSuggestedDate = (value?: string | Date | null) => {
  if (!value) return '';
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
};

const DEFAULT_MANUAL_TIME = '09:00';

export const NewAppointmentModal = ({
  open,
  onOpenChange,
  suggestedDate,
  suggestedService,
  services: providedServices,
  servicesLoading,
  onConfirm,
  professionalId,
}: NewAppointmentModalProps) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedClientPhone, setSelectedClientPhone] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [slotRange, setSlotRange] = useState<SlotRange>(() =>
    SLOT_GROUPS.morning.length > 0 ? 'morning' : 'afternoon'
  );

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
  const minSelectableDate = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  const canFetchSlots = useMemo(
    () => !manualMode && Boolean(selectedServiceId && selectedDate && professionalId),
    [manualMode, selectedServiceId, selectedDate, professionalId]
  );

  const {
    data: slotsData,
    isFetching: isFetchingSlots,
    error: slotsError,
  } = useQuery({
    queryKey: ['pros', 'slots', selectedServiceId, selectedDate, professionalId],
    enabled: canFetchSlots,
    staleTime: 30_000,
    retry: 1,
    queryFn: async () => {
      if (!selectedServiceId || !selectedDate) return { slots: [] };
      return await api.getSlots({
        service_id: selectedServiceId,
        date: selectedDate,
        professional_id: professionalId ?? undefined,
      });
    },
  });

  const availableSlots = useMemo(() => slotsData?.slots ?? [], [slotsData]);
  const slotErrorMessage = useMemo(() => {
    if (!slotsError) return null;
    if (slotsError instanceof Error) return slotsError.message;
    return 'No se pudo cargar la disponibilidad.';
  }, [slotsError]);

  const slotLabel = (iso: string) => {
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return iso;
    return format(dt, 'HH:mm');
  };

  useEffect(() => {
    if (open) {
      setManualMode(false);
      const initialDate = formattedSuggestedDate || minSelectableDate;
      setSelectedDate(initialDate);
      setSelectedServiceId((current) => {
        if (suggestedService) return suggestedService;
        if (current && services.some((svc) => svc.id === current)) return current;
        return services[0]?.id ?? '';
      });
      setSelectedClient('');
      setSelectedClientPhone('');
      setNotes('');
      setSelectedTime('');
      setIsSubmitting(false);
    } else {
      setSelectedTime('');
      setSelectedClient('');
      setSelectedClientPhone('');
      setSelectedServiceId('');
      setSelectedDate('');
      setNotes('');
      setManualMode(false);
      setIsSubmitting(false);
    }
  }, [open, formattedSuggestedDate, suggestedService, services, minSelectableDate]);

  useEffect(() => {
    if (!manualMode && selectedDate && selectedDate < minSelectableDate) {
      setSelectedDate(minSelectableDate);
    }
  }, [manualMode, selectedDate, minSelectableDate]);

  useEffect(() => {
    if (manualMode) return;
    if (availableSlots.length > 0) {
      const exists = availableSlots.some((slot) => slotLabel(slot) === selectedTime);
      if (!exists) {
        const first = availableSlots[0];
        setSelectedTime(slotLabel(first));
      }
    } else {
      if (selectedTime) {
        setSelectedTime('');
      }
    }
  }, [manualMode, availableSlots, selectedTime]);

  const handleClose = () => onOpenChange(false);

  const trimmedClient = selectedClient.trim();
  const trimmedPhone = selectedClientPhone.trim();

  const isConfirmDisabled =
    !trimmedClient ||
    !trimmedPhone ||
    !selectedDate ||
    !selectedTime ||
    !selectedServiceId ||
    !selectedService ||
    isSubmitting;

  const handleConfirm = async () => {
    if (isConfirmDisabled || !selectedService) return;

    const payload: NewAppointmentFormValues = {
      client: trimmedClient,
      clientPhone: trimmedPhone,
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
        <div className="mt-4 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
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
                className="border-border focus-visible:ring-primary/30"
                required
              />
            </div>
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
                className="border-border focus-visible:ring-primary/30"
                required
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
              min={manualMode ? undefined : minSelectableDate}
              onChange={(event) => {
                const next = event.target.value;
                if (!manualMode && next && next < minSelectableDate) {
                  setSelectedDate(minSelectableDate);
                } else {
                  setSelectedDate(next);
                }
              }}
              className="border-border focus-visible:ring-primary/30"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Clock className="h-4 w-4" aria-hidden="true" />
              Horarios disponibles
            </Label>
            <div className="space-y-3">
              <div className="inline-flex w-full max-w-[320px] items-center justify-between gap-1 rounded-full border border-border/60 bg-card/70 p-1 text-xs text-muted-foreground shadow-inner sm:text-sm">
                {SLOT_RANGE_OPTIONS.map(({ value, label }) => {
                  const active = slotRange === value;
                  const disabled = value === 'morning' ? morningDisabled : afternoonDisabled;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => !disabled && setSlotRange(value)}
                      className={cn(
                        'flex-1 rounded-full px-4 py-1.5 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                        active ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-primary/5',
                        disabled && 'cursor-not-allowed opacity-40'
                      )}
                      aria-pressed={active}
                      disabled={disabled}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {displayedSlots.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border/60 px-4 py-3 text-sm text-muted-foreground">
                  No hay horarios disponibles en este tramo.
                </p>
              ) : (
                <div className="grid w-full grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2 sm:gap-3">
                  {displayedSlots.map((slot) => {
                    const isSelected = selectedTime === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedTime(slot)}
                        className={cn(
                          'h-11 w-full rounded-lg border border-border/60 bg-card/80 px-4 text-sm font-semibold tracking-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                          isSelected
                            ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                            : 'hover:border-primary/40 hover:bg-primary/5'
                        )}
                        aria-pressed={isSelected}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              )}
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
                      'cursor-pointer border border-border bg-card/80 p-3 transition-all hover:border-primary/40 hover:bg-primary/5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/40',
                      selectedServiceId === service.id && 'border-primary bg-primary/10 shadow-sm'
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
              className="min-h-[80px] border-border focus-visible:ring-primary/30"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-3 pt-4 sm:flex-row">
            <Button
              type="button"
              variant="primaryAction"
              className="flex-1"
              disabled={isConfirmDisabled}
              aria-busy={isSubmitting}
              onClick={handleConfirm}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Creando…
                </span>
              ) : (
                'Crear cita'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
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
