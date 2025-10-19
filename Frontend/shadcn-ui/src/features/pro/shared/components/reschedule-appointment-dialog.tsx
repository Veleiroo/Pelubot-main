import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { Service } from '@/lib/api';

import type { Appointment } from '../types';

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
  timeOptions?: string[];
  isSubmitting: boolean;
  onSubmit: (values: RescheduleFormValues) => Promise<void>;
};

export const RESCHEDULE_TIME_OPTIONS = Array.from({ length: (22 - 8) * 2 + 1 }, (_, index) => {
  const base = 8 * 60 + index * 30;
  const hours = Math.floor(base / 60);
  const minutes = base % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
});

export const formatRescheduleDialogDate = (date: Date) =>
  format(date, "EEEE d 'de' MMMM", { locale: es });

export const RescheduleAppointmentDialog = ({
  open,
  onOpenChange,
  appointment,
  service,
  timeOptions = RESCHEDULE_TIME_OPTIONS,
  isSubmitting,
  onSubmit,
}: RescheduleAppointmentDialogProps) => {
  const [date, setDate] = useState(appointment?.date ?? '');
  const [time, setTime] = useState(appointment?.time ?? '10:00');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDate(appointment?.date ?? '');
    setTime(appointment?.time ?? '10:00');
    setError(null);
  }, [open, appointment?.date, appointment?.time]);

  const appointmentDate = useMemo(() => {
    const base = appointment?.date;
    if (!base) return null;
    const parsed = new Date(`${base}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, [appointment?.date]);
  const selectedDate = useMemo(() => {
    if (!date) return null;
    const parsed = new Date(`${date}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, [date]);
  const isSubmitDisabled = !date || !time || isSubmitting;

  if (!appointment || !appointmentDate) return null;

  const durationMinutes = appointment.durationMinutes ?? service?.duration_min ?? 45;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!date) {
      setError('Selecciona una nueva fecha.');
      return;
    }
    if (!time) {
      setError('Selecciona un horario disponible.');
      return;
    }
    try {
      await onSubmit({ newDate: date, newTime: time, durationMinutes });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo reprogramar la cita.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg border-border bg-card sm:max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Reprogramar cita</DialogTitle>
          <DialogDescription>
            Ajusta la hora para {appointment.client} ({formatRescheduleDialogDate(appointmentDate)}).
          </DialogDescription>
        </DialogHeader>
        <form className="mt-4 space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="new-time" className="text-sm font-medium">
              Nueva hora
            </Label>
            <Select value={time} onValueChange={setTime} disabled={isSubmitting}>
              <SelectTrigger id="new-time" className="border-border bg-secondary/50">
                <SelectValue placeholder="Selecciona una hora" />
              </SelectTrigger>
              <SelectContent className="border-border bg-card">
                {timeOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option} h
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Duración estimada: {durationMinutes} minutos.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-secondary/40 p-4 sm:rounded-2xl">
            <p className="text-base font-semibold text-foreground sm:text-lg">{appointment.service}</p>
            <p className="text-sm text-muted-foreground">{appointment.client}</p>
            {(appointment.clientPhone || appointment.clientEmail) && (
              <p className="mt-1 text-xs text-muted-foreground">
                {[appointment.clientPhone, appointment.clientEmail].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primaryAction"
              className="w-full sm:w-auto"
              disabled={isSubmitting}
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

          <DialogDescription className="text-[10px] text-white/40 sm:text-xs">
            Reprogramar enviará una notificación al cliente con la nueva hora.
          </DialogDescription>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RescheduleAppointmentDialog;
