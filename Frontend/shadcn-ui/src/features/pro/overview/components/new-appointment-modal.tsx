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
  slotStartIso?: string;
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

const WEEKDAY_MANUAL_SLOTS = [
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '12:30',
  '13:00',
  '16:30',
  '17:00',
  '17:30',
  '18:00',
  '18:30',
  '19:00',
  '19:30',
  '20:00',
] as const;

const SATURDAY_MANUAL_SLOTS = [
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
] as const;

const SLOT_RANGE_OPTIONS = [
  { value: 'morning', label: 'Mañana' },
  { value: 'afternoon', label: 'Tarde / Noche' },
] as const;

type SlotRange = (typeof SLOT_RANGE_OPTIONS)[number]['value'];

const groupSlotsByRange = (slots: string[]): Record<SlotRange, string[]> => {
  const groups: Record<SlotRange, string[]> = {
    morning: [],
    afternoon: [],
  };

  for (const slot of slots) {
    const [hoursPart] = slot.split(':');
    const hour = Number.parseInt(hoursPart ?? '', 10);
    if (!Number.isNaN(hour) && hour < 15) {
      groups.morning.push(slot);
    } else {
      groups.afternoon.push(slot);
    }
  }

  return groups;
};

const normalizePhone = (value: string) => value.replace(/\s+/g, ' ').trim();

const getPhoneDigits = (value: string) => normalizePhone(value).replace(/\D/g, '');

const validatePhone = (value: string) => {
  const digits = getPhoneDigits(value);
  if (digits.length < 9) {
    return 'Introduce un teléfono válido (al menos 9 dígitos).';
  }
  return null;
};

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
  const [slotRange, setSlotRange] = useState<SlotRange>('morning');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneTouched, setPhoneTouched] = useState(false);

  const manualSlotOptions = useMemo(() => {
    if (!selectedDate) return [...WEEKDAY_MANUAL_SLOTS];
    const parsed = new Date(`${selectedDate}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return [...WEEKDAY_MANUAL_SLOTS];
    const day = parsed.getDay();
    if (day === 0) return [];
    if (day === 6) return [...SATURDAY_MANUAL_SLOTS];
    return [...WEEKDAY_MANUAL_SLOTS];
  }, [selectedDate]);

  const manualSlotGroups = useMemo(() => groupSlotsByRange(manualSlotOptions), [manualSlotOptions]);

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

  const canFetchSlots = useMemo(() => {
    if (manualMode) return false;
    if (!selectedServiceId || !selectedDate) return false;
    const requiresProfessional = professionalId !== undefined;
    if (requiresProfessional && !professionalId) return false;
    return true;
  }, [manualMode, professionalId, selectedServiceId, selectedDate]);

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

  const {
    automaticSlotLabels,
    automaticSlotGroups,
    automaticSlotMap,
  } = useMemo(() => {
    const map = new Map<string, string>();
    const labels: string[] = [];

    if (slotsData?.slots) {
      const entries = slotsData.slots
        .map((iso) => {
          const parsed = new Date(iso);
          if (Number.isNaN(parsed.getTime())) return null;
          const label = format(parsed, 'HH:mm');
          const minutes = parsed.getHours() * 60 + parsed.getMinutes();
          return { iso, label, minutes };
        })
        .filter(Boolean) as Array<{ iso: string; label: string; minutes: number }>;

      entries
        .sort((a, b) => {
          const diff = a.minutes - b.minutes;
          if (diff !== 0) return diff;
          return a.iso.localeCompare(b.iso);
        })
        .forEach(({ label, iso }) => {
          if (!map.has(label)) {
            map.set(label, iso);
            labels.push(label);
          }
        });
    }

    return {
      automaticSlotLabels: labels,
      automaticSlotGroups: groupSlotsByRange(labels),
      automaticSlotMap: map,
    };
  }, [slotsData]);
  const isLoadingSlots = !manualMode && isFetchingSlots;
  const slotGroups = manualMode ? manualSlotGroups : automaticSlotGroups;
  const morningDisabled = manualMode
    ? slotGroups.morning.length === 0
    : isLoadingSlots || slotGroups.morning.length === 0;
  const afternoonDisabled = manualMode
    ? slotGroups.afternoon.length === 0
    : isLoadingSlots || slotGroups.afternoon.length === 0;
  const displayedSlots = manualMode
    ? slotGroups[slotRange] ?? []
    : isLoadingSlots
      ? []
      : slotGroups[slotRange] ?? [];

  const slotErrorMessage = useMemo(() => {
    if (!slotsError) return null;
    return 'No se pudo cargar la disponibilidad.';
  }, [slotsError]);

  useEffect(() => {
    if (open) {
      setManualMode(false);
      setSlotRange('morning');
      const initialDate = formattedSuggestedDate || minSelectableDate;
      setSelectedDate(initialDate);
      setSelectedServiceId((current) => {
        if (suggestedService) return suggestedService;
        if (current && services.some((svc) => svc.id === current)) return current;
        return services[0]?.id ?? '';
      });
      setSelectedClient('');
      setSelectedClientPhone('');
      setPhoneError(null);
      setPhoneTouched(false);
      setNotes('');
      setSelectedTime('');
      setIsSubmitting(false);
    } else {
      setSelectedTime('');
      setSelectedClient('');
      setSelectedClientPhone('');
      setPhoneError(null);
      setPhoneTouched(false);
      setSelectedServiceId('');
      setSelectedDate('');
      setNotes('');
      setManualMode(false);
      setSlotRange('morning');
      setIsSubmitting(false);
    }
  }, [open, formattedSuggestedDate, suggestedService, services, minSelectableDate]);

  useEffect(() => {
    if (!manualMode && selectedDate && selectedDate < minSelectableDate) {
      setSelectedDate(minSelectableDate);
    }
  }, [manualMode, selectedDate, minSelectableDate]);

  useEffect(() => {
    if (manualMode) {
      const availableSlots = slotGroups[slotRange];
      if (availableSlots.length > 0) {
        if (!availableSlots.includes(selectedTime)) {
          setSelectedTime(availableSlots[0]);
        }
        return;
      }

      if (manualSlotOptions.length === 0) {
        if (selectedTime) setSelectedTime('');
        return;
      }

      if (!selectedTime || !manualSlotOptions.includes(selectedTime)) {
        setSelectedTime(manualSlotOptions[0]);
      }
      return;
    }

    if (automaticSlotLabels.length === 0) {
      if (selectedTime) setSelectedTime('');
      return;
    }

    if (!automaticSlotLabels.includes(selectedTime)) {
      setSelectedTime(automaticSlotLabels[0]);
    }
  }, [manualMode, automaticSlotLabels, manualSlotOptions, selectedTime, slotGroups, slotRange]);

  useEffect(() => {
    if (isLoadingSlots) return;

    const activeGroups = manualMode ? manualSlotGroups : automaticSlotGroups;
    if (activeGroups.morning.length === 0 && activeGroups.afternoon.length === 0) return;
    if (activeGroups[slotRange].length > 0) return;

    if (activeGroups.morning.length > 0) {
      setSlotRange('morning');
      return;
    }

    if (activeGroups.afternoon.length > 0) {
      setSlotRange('afternoon');
    }
  }, [automaticSlotGroups, manualSlotGroups, isLoadingSlots, manualMode, slotRange]);

  const handleClose = () => onOpenChange(false);

  const trimmedClient = selectedClient.trim();
  const trimmedPhone = selectedClientPhone.trim();
  const phoneValidationMessage = validatePhone(trimmedPhone);
  const isPhoneValid = !phoneValidationMessage;
  const sanitizedPhone = normalizePhone(trimmedPhone);

  const hasSelectedSlot = manualMode ? Boolean(selectedTime) : Boolean(selectedTime && automaticSlotMap.has(selectedTime));

  const isConfirmDisabled =
    !trimmedClient ||
    !selectedDate ||
    !hasSelectedSlot ||
    !selectedServiceId ||
    !selectedService ||
    !isPhoneValid ||
    isSubmitting;

  const handleConfirm = async () => {
    if (isConfirmDisabled || !selectedService) return;

    const slotStartIso = manualMode ? undefined : automaticSlotMap.get(selectedTime);

    if (!isPhoneValid) {
      setPhoneTouched(true);
      setPhoneError(phoneValidationMessage ?? 'Introduce un teléfono válido (al menos 9 dígitos).');
      return;
    }

    setPhoneError(null);

    const payload: NewAppointmentFormValues = {
      client: trimmedClient,
      clientPhone: sanitizedPhone,
      date: selectedDate,
      time: selectedTime,
      serviceId: selectedServiceId,
      serviceName: selectedService.name,
      durationMinutes: selectedService.duration_min,
      notes,
      slotStartIso,
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
                onChange={(event) => {
                  const next = event.target.value;
                  setSelectedClientPhone(next);
                  if (phoneTouched) {
                    setPhoneError(validatePhone(next));
                  }
                }}
                onBlur={(event) => {
                  setPhoneTouched(true);
                  setPhoneError(validatePhone(event.target.value));
                }}
                className="border-border focus-visible:ring-primary/30"
                aria-invalid={phoneTouched && Boolean(phoneError)}
                aria-describedby={phoneTouched && phoneError ? 'client-phone-error' : undefined}
                required
              />
              {phoneTouched && phoneError ? (
                <p id="client-phone-error" className="text-xs text-destructive">
                  {phoneError}
                </p>
              ) : null}
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

          <div className="flex items-start justify-between gap-4 rounded-lg border border-border/60 bg-card/70 px-4 py-3">
            <div className="space-y-1">
              <Label htmlFor="manual-mode" className="text-sm font-medium">
                Permitir fechas pasadas
              </Label>
              <p className="text-xs text-muted-foreground">
                Activa el modo manual para registrar citas fuera de la disponibilidad publicada. Horario estándar: L-V 09:30–13:30 y 16:30–20:30; sábados 09:00–14:00.
              </p>
            </div>
            <Switch
              id="manual-mode"
              checked={manualMode}
              onCheckedChange={setManualMode}
              aria-label="Permitir crear citas en fechas pasadas"
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

              {!manualMode && isLoadingSlots ? (
                <p className="flex items-center gap-2 rounded-lg border border-dashed border-border/60 px-4 py-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Cargando disponibilidad…
                </p>
              ) : displayedSlots.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border/60 px-4 py-3 text-sm text-muted-foreground">
                  {manualMode
                    ? 'No hay horarios manuales disponibles para este día.'
                    : 'No hay horarios disponibles en este tramo.'}
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

              {slotErrorMessage && !manualMode && !isLoadingSlots && (
                <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {slotErrorMessage}
                </p>
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
