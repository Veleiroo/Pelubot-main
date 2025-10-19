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
      <DialogContent className="max-w-[calc(100%-2rem)] border-white/10 bg-slate-950/95 text-white sm:max-w-lg">
        <DialogHeader className="space-y-1.5 text-left sm:space-y-2">
          <DialogTitle className="text-lg sm:text-xl">Reprogramar cita</DialogTitle>
          <DialogDescription className="text-xs text-white/70 sm:text-sm">
            Ajusta la fecha y hora para {appointment.client} (
            {formatRescheduleDialogDate(selectedDate ?? appointmentDate)}).
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4 sm:space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="new-date" className="text-xs sm:text-sm">
              Nueva fecha
            </Label>
            <Input
              id="new-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              disabled={isSubmitting}
              className="border-white/15 bg-white/5 text-white"
            />
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <Label className="text-xs sm:text-sm">Horario disponible</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {timeOptions.map((option) => (
                <Button
                  key={option}
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() => setTime(option)}
                  className={cn(
                    'rounded-full border-white/20 bg-transparent text-xs text-white transition hover:bg-white/10',
                    time === option &&
                      'border-emerald-400 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30'
                  )}
                >
                  {option} h
                </Button>
              ))}
            </div>
            <p className="text-[10px] text-white/40 sm:text-xs">Duración estimada: {durationMinutes} minutos.</p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/80 sm:rounded-2xl sm:p-4 sm:text-sm">
            <p className="text-sm font-semibold text-white sm:text-base">{appointment.service}</p>
            <p>{appointment.client}</p>
            {(appointment.clientPhone || appointment.clientEmail) && (
              <p className="text-[10px] text-white/60 sm:text-xs">
                {[appointment.clientPhone, appointment.clientEmail].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>

          {error && <p className="text-xs text-rose-300 sm:text-sm">{error}</p>}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="rounded-full border-white/20 text-sm text-white/80 hover:bg-white/10"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="rounded-full bg-emerald-500 px-4 text-sm font-semibold text-emerald-950 hover:bg-emerald-400 sm:px-5"
              disabled={isSubmitDisabled}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando
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
