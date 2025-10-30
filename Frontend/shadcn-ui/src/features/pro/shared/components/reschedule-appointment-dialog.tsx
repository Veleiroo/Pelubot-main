import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Clock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

import { api, type Service } from '@/lib/api';
import type { Appointment } from '../../shared/types';

export const RESCHEDULE_TIME_OPTIONS = Array.from({ length: (22 - 8) * 2 + 1 }, (_, index) => {
  const base = 8 * 60 + index * 30;
  const hours = Math.floor(base / 60);
  const minutes = base % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
});

export type RescheduleFormValues = {
  newDate: string;
  newTime: string;
  durationMinutes: number;
};

export type RescheduleAppointmentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment | null;
  service?: Service;
  isSubmitting: boolean;
  onSubmit: (values: RescheduleFormValues) => Promise<void>;
  professionalId?: string | null;
};

export const formatRescheduleDialogDate = (date: Date) =>
  format(date, "EEEE d 'de' MMMM", { locale: es });

const SLOT_RANGE_OPTIONS = [
  { value: 'morning', label: 'Mañana' },
  { value: 'afternoon', label: 'Tarde / Noche' },
] as const;

export const RescheduleAppointmentDialog = ({
  open,
  onOpenChange,
  appointment,
  service,
  isSubmitting,
  onSubmit,
  professionalId,
}: RescheduleAppointmentDialogProps) => {
  const serviceId = service?.id ?? appointment?.serviceId ?? null;
  const [date, setDate] = useState(() => (appointment?.date ? appointment.date : ''));
  const [time, setTime] = useState(() => appointment?.time ?? '');
  const [slotRange, setSlotRange] = useState<'morning' | 'afternoon'>('morning');
  const [error, setError] = useState<string | null>(null);

  const effectiveProfessionalId = professionalId ?? null;

  useEffect(() => {
    if (!open) return;
    setDate(appointment?.date ?? '');
    setTime(appointment?.time ?? '');
    setError(null);
  }, [open, appointment?.date, appointment?.time]);

  const { data: slotData, isFetching: isLoadingSlots } = useQuery({
    queryKey: ['pros', 'reschedule-slots', serviceId, date, effectiveProfessionalId],
    enabled: Boolean(serviceId && date && effectiveProfessionalId),
    staleTime: 30_000,
    queryFn: async () => {
      if (!serviceId || !date) return { slots: [] as string[] };
      return await api.getSlots({
        service_id: serviceId,
        date,
        professional_id: effectiveProfessionalId ?? undefined,
      });
    },
  });

  const { labels, grouped } = useMemo(() => {
    const tempLabels: string[] = [];

    if (slotData?.slots?.length) {
      slotData.slots.forEach((iso) => {
        const parsed = new Date(iso);
        if (Number.isNaN(parsed.getTime())) return;
        const label = format(parsed, 'HH:mm');
        if (!tempLabels.includes(label)) tempLabels.push(label);
      });
    }

    const group: Record<'morning' | 'afternoon', string[]> = {
      morning: [],
      afternoon: [],
    };

    for (const label of tempLabels) {
      const hour = Number.parseInt(label.slice(0, 2), 10);
      if (!Number.isNaN(hour) && hour < 15) {
        group.morning.push(label);
      } else {
        group.afternoon.push(label);
      }
    }

    return { labels: tempLabels, grouped: group };
  }, [slotData]);

  const morningTimes = grouped.morning;
  const afternoonTimes = grouped.afternoon;

  useEffect(() => {
    if (!open) return;
    if (!labels.length) {
      setTime('');
      return;
    }

    const preferredRange = morningTimes.length > 0 ? 'morning' : 'afternoon';
    setSlotRange(preferredRange);

    if (!time || !labels.includes(time)) {
      const fallback =
        preferredRange === 'morning'
          ? morningTimes[0] ?? afternoonTimes[0]
          : afternoonTimes[0] ?? morningTimes[0];
      if (fallback) setTime(fallback);
    }
  }, [labels, morningTimes, afternoonTimes, time, open]);

  const appointmentDate = useMemo(() => {
    if (!appointment?.date) return null;
    const parsed = new Date(`${appointment.date}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, [appointment?.date]);

  const selectedDate = useMemo(() => {
    if (!date) return null;
    const parsed = new Date(`${date}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, [date]);

  const previewDateLabel = selectedDate
    ? formatRescheduleDialogDate(selectedDate)
    : appointmentDate
    ? formatRescheduleDialogDate(appointmentDate)
    : '';

  const previewTimeLabel = time || appointment?.time || '';
  const durationMinutes = appointment?.durationMinutes ?? service?.duration_min ?? 45;

  const displayedTimes = slotRange === 'morning' ? morningTimes : afternoonTimes;
  const isSubmitDisabled = !date || !time || !labels.includes(time) || isSubmitting;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!date) {
      setError('Selecciona una nueva fecha.');
      return;
    }
    if (!time || !labels.includes(time)) {
      setError('Selecciona un horario disponible.');
      return;
    }

    try {
      await onSubmit({ newDate: date, newTime: time, durationMinutes });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo reprogramar la cita.');
    }
  };

  const handleClose = () => {
    if (!isSubmitting) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-border bg-card">
        <header className="space-y-1 border-b border-border/60 pb-4">
          <h2 className="text-2xl font-semibold text-foreground">Reprogramar cita</h2>
          <p className="text-sm text-muted-foreground">
            Actualmente programada el {appointmentDate ? formatRescheduleDialogDate(appointmentDate) : '—'} a las {appointment?.time ?? '—'} h.
            Selecciona la nueva fecha y hora para {appointment?.client ?? 'el cliente'}.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,220px)_1fr]">
            <div className="space-y-2">
              <Label htmlFor="new-date" className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="h-4 w-4" aria-hidden="true" />
                Nueva fecha
              </Label>
              <Input
                id="new-date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="border-border focus-visible:ring-primary/30"
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Clock className="h-4 w-4" aria-hidden="true" />
                Horarios disponibles
              </Label>
              {!date || isLoadingSlots ? (
                <p className="flex items-center gap-2 rounded-lg border border-dashed border-border/60 px-4 py-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  {date ? 'Buscando disponibilidad…' : 'Selecciona una fecha para ver horarios.'}
                </p>
              ) : labels.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border/60 px-4 py-3 text-sm text-muted-foreground">
                  No hay horarios disponibles en esta fecha.
                </p>
              ) : (
                <>
                  <div className="inline-flex w-full max-w-[320px] items-center justify-between gap-1 rounded-full border border-border/60 bg-card/70 p-1 text-xs text-muted-foreground shadow-inner sm:text-sm">
                    {SLOT_RANGE_OPTIONS.map(({ value, label }) => {
                      const active = slotRange === value;
                      const disabled = value === 'morning' ? morningTimes.length === 0 : afternoonTimes.length === 0;
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
                          disabled={disabled}
                          aria-pressed={active}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid w-full grid-cols-[repeat(auto-fit,minmax(110px,1fr))] gap-2">
                    {displayedTimes.map((option) => {
                      const isSelected = time === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setTime(option)}
                          disabled={isSubmitting}
                          className={cn(
                            'h-10 rounded-lg border border-border/60 bg-card/80 px-4 text-sm font-semibold tracking-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                            isSelected
                              ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                              : 'hover:border-primary/40 hover:bg-primary/5'
                          )}
                          aria-pressed={isSelected}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/70 p-4">
            <p className="text-sm text-muted-foreground">
              Nueva cita: <span className="font-semibold text-foreground">{previewDateLabel}</span> a las{' '}
              <span className="font-semibold text-foreground">{previewTimeLabel} h</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Duración estimada: {durationMinutes} minutos.</p>
          </div>

          <div className="rounded-xl border border-border/70 bg-card/60 p-4">
            <p className="text-sm font-semibold text-foreground">{appointment?.service}</p>
            <p className="text-sm text-muted-foreground">{appointment?.client}</p>
            {appointment?.clientPhone ? (
              <p className="mt-1 text-xs text-muted-foreground">{appointment.clientPhone}</p>
            ) : null}
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primaryAction"
              className="flex-1"
              disabled={isSubmitDisabled}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Guardando…
                </span>
              ) : (
                'Actualizar cita'
              )}
            </Button>
          </div>
        </form>

        <p className="pt-3 text-[10px] text-muted-foreground/70 sm:text-xs">
          Reprogramar notificará automáticamente al cliente con la nueva fecha y hora.
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default RescheduleAppointmentDialog;
