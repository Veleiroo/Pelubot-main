import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2, RefreshCcw } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { api, ApiError, type Service } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useProSession } from '@/store/pro';

import { MIN_APPOINTMENTS_CARD_HEIGHT } from '../shared/constants';
import type { Appointment } from '../shared/types';
import { AppointmentsCard } from './components/appointments-card';
import { CalendarCard } from './components/calendar-card';
import { useAgendaActions } from './hooks/useAgendaActions';
import { useAgendaData } from './hooks/useAgendaData';
import { useAgendaState } from './hooks/useAgendaState';

const TIME_OPTIONS = Array.from({ length: (22 - 8) * 2 + 1 }, (_, index) => {
  const base = 8 * 60 + index * 30;
  const hours = Math.floor(base / 60);
  const minutes = base % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
});

const formatDialogDate = (date: Date) => format(date, "EEEE d 'de' MMMM", { locale: es });

const toErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof ApiError) return error.detail || error.message || fallback;
  if (error instanceof Error) return error.message || fallback;
  return fallback;
};

type CreateFormValues = {
  serviceId: string;
  serviceName: string;
  durationMinutes: number;
  time: string;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  notes?: string;
};

type RescheduleFormValues = {
  newTime: string;
  durationMinutes: number;
};

export const ProsAgendaView = () => {
  const { toast } = useToast();
  const { session } = useProSession();
  const layoutRef = useRef<HTMLElement>(null);
  const calendarCardRef = useRef<HTMLDivElement>(null);
  const appointmentsCardRef = useRef<HTMLDivElement>(null);
  const [appointmentsCardHeight, setAppointmentsCardHeight] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);

  const stylist = session?.stylist;

  const { data: servicesData } = useQuery({
    queryKey: ['services'],
    queryFn: api.getServices,
    staleTime: 300_000,
    enabled: Boolean(stylist),
  });

  const {
    appointments,
    isLoading,
    isFetching,
    errorMessage,
    refetch,
  } = useAgendaData(Boolean(stylist));

  const {
    selectedDate,
    currentMonth,
    today,
    busyDates,
    selectedAppointments,
    summary,
    dayLabel,
    fromMonth,
    toMonth,
    disablePrevNav,
    disableNextNav,
    previousMonthCandidate,
    nextMonthCandidate,
    handleSelectDay,
    handleMonthChange,
    goToMonth,
    isTodaySelected,
  } = useAgendaState(appointments);

  const availableServices = useMemo(() => {
    if (!servicesData?.length) return [] as Service[];
    const allowed = stylist?.services;
    if (!allowed || allowed.length === 0) return servicesData;
    return servicesData.filter((service) => allowed.includes(service.id));
  }, [servicesData, stylist?.services]);

  const defaultServiceId = availableServices[0]?.id ?? null;

  const {
    createAppointment,
    rescheduleAppointment,
    cancelAppointment,
    isCreating,
    isRescheduling,
    isCancelling,
  } = useAgendaActions({ professionalId: stylist?.id });

  const handlePrevNav = () => {
    if (disablePrevNav) return;
    goToMonth(previousMonthCandidate);
  };

  const handleNextNav = () => {
    if (disableNextNav) return;
    goToMonth(nextMonthCandidate);
  };

  const handleAppointmentAction = (action: 'reschedule' | 'cancel', appointment: Appointment) => {
    if (action === 'reschedule') {
      setRescheduleTarget(appointment);
    } else {
      setCancelTarget(appointment);
    }
  };

  const handleCreateClick = () => {
    if (availableServices.length === 0) {
      toast({
        title: 'No hay servicios configurados',
        description: 'Configura al menos un servicio para poder crear nuevas citas.',
        variant: 'destructive',
      });
      return;
    }
    setCreateOpen(true);
  };

  const handleCreateSubmit = async (values: CreateFormValues) => {
    const targetDate = selectedDate ?? new Date();
    try {
      await createAppointment({
        date: targetDate,
        ...values,
      });
      toast({
        title: 'Cita creada',
        description: `${values.clientName} tiene cita el ${formatDialogDate(targetDate)} a las ${values.time} h.`,
      });
      setCreateOpen(false);
    } catch (error) {
      const message = toErrorMessage(error, 'No se pudo crear la cita. Inténtalo de nuevo.');
      toast({ title: 'No se pudo crear la cita', description: message, variant: 'destructive' });
      throw new Error(message);
    }
  };

  const handleRescheduleSubmit = async (values: RescheduleFormValues) => {
    const target = rescheduleTarget;
    if (!target) return;
    const appointmentDate = new Date(`${target.date}T00:00:00`);
    try {
      await rescheduleAppointment({
        reservationId: target.id,
        date: appointmentDate,
        newTime: values.newTime,
        durationMinutes: values.durationMinutes,
      });
      toast({
        title: 'Cita reprogramada',
        description: `${target.client} ahora está programado el ${formatDialogDate(appointmentDate)} a las ${values.newTime} h.`,
      });
      setRescheduleTarget(null);
    } catch (error) {
      const message = toErrorMessage(error, 'No se pudo reprogramar la cita. Inténtalo de nuevo.');
      toast({ title: 'No se pudo reprogramar', description: message, variant: 'destructive' });
      throw new Error(message);
    }
  };

  const handleCancelConfirm = async () => {
    const target = cancelTarget;
    if (!target) return;
    try {
      await cancelAppointment({ reservationId: target.id });
      toast({
        title: 'Cita cancelada',
        description: `${target.client} ya no tiene la cita de las ${target.time} h.`,
      });
      setCancelTarget(null);
    } catch (error) {
      const message = toErrorMessage(error, 'No se pudo cancelar la cita.');
      toast({ title: 'No se pudo cancelar la cita', description: message, variant: 'destructive' });
      throw new Error(message);
    }
  };

  useLayoutEffect(() => {
    const recalc = () => {
      const root = layoutRef.current;
      const calendarCard = calendarCardRef.current;
      const appointmentsCard = appointmentsCardRef.current;
      const isDesktop = window.innerWidth >= 1280;
      if (!root || !calendarCard || !appointmentsCard || !isDesktop) {
        setAppointmentsCardHeight(null);
        return;
      }

      const viewportHeight = window.innerHeight;
      const rootRect = root.getBoundingClientRect();
      const cardRect = calendarCard.getBoundingClientRect();
      const gap = 24;
      const buffer = 40;

      const available = viewportHeight - rootRect.top - cardRect.height - gap - buffer;
      if (!Number.isFinite(available) || available <= 320) {
        setAppointmentsCardHeight(null);
        return;
      }

      setAppointmentsCardHeight(Math.min(available, 720));
    };

    recalc();
    window.addEventListener('resize', recalc);
    return () => window.removeEventListener('resize', recalc);
  }, []);

  const computedHeight = appointmentsCardHeight === null
    ? null
    : Math.max(appointmentsCardHeight, MIN_APPOINTMENTS_CARD_HEIGHT);

  if (!stylist) {
    return (
      <section className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-white/80">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="text-sm">Cargando tu agenda...</p>
      </section>
    );
  }

  const rescheduleService = rescheduleTarget
    ? availableServices.find((service) => service.id === rescheduleTarget.serviceId)
    : undefined;
  const cancelService = cancelTarget
    ? availableServices.find((service) => service.id === cancelTarget.serviceId)
    : undefined;

  return (
    <section ref={layoutRef} className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-white">Agenda</h1>
            <p className="text-sm text-white/60">
              Visualiza tu calendario, revisa tus citas y gestiona cambios desde un solo lugar.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2 rounded-full border-white/20 text-white/80 hover:bg-white/10"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
            Actualizar
          </Button>
        </div>
        {errorMessage && (
          <Alert variant="destructive" className="border-red-500/40 bg-red-500/10 text-red-100">
            <AlertTitle>No pudimos cargar tu agenda</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
        {isLoading && appointments.length === 0 && (
          <div className="flex items-center gap-2 text-sm text-white/70">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Obteniendo citas recientes...</span>
          </div>
        )}
      </header>

      <div
        className={cn(
          'grid items-start gap-6',
          'xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]',
          '2xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]'
        )}
      >
        <CalendarCard
          ref={calendarCardRef}
          selectedDate={selectedDate}
          currentMonth={currentMonth}
          today={today}
          busyDates={busyDates}
          fromMonth={fromMonth}
          toMonth={toMonth}
          disablePrev={disablePrevNav}
          disableNext={disableNextNav}
          onSelectDay={handleSelectDay}
          onMonthChange={handleMonthChange}
          onPrev={handlePrevNav}
          onNext={handleNextNav}
          description="Selecciona un día para revisar o añadir citas."
        />

        <AppointmentsCard
          ref={appointmentsCardRef}
          dayLabel={dayLabel}
          summary={summary}
          appointments={selectedAppointments}
          isToday={isTodaySelected}
          onCreate={handleCreateClick}
          onAction={handleAppointmentAction}
          minHeight={MIN_APPOINTMENTS_CARD_HEIGHT}
          height={computedHeight}
        />
      </div>

      <CreateAppointmentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        date={selectedDate ?? new Date()}
        services={availableServices}
        defaultServiceId={defaultServiceId}
        timeOptions={TIME_OPTIONS}
        isSubmitting={isCreating}
        onSubmit={handleCreateSubmit}
      />

      <RescheduleAppointmentDialog
        open={Boolean(rescheduleTarget)}
        onOpenChange={(open) => {
          if (!open) setRescheduleTarget(null);
        }}
        appointment={rescheduleTarget}
        service={rescheduleService}
        timeOptions={TIME_OPTIONS}
        isSubmitting={isRescheduling}
        onSubmit={handleRescheduleSubmit}
      />

      <CancelAppointmentDialog
        open={Boolean(cancelTarget)}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null);
        }}
        appointment={cancelTarget}
        service={cancelService}
        isSubmitting={isCancelling}
        onConfirm={handleCancelConfirm}
      />
    </section>
  );
};

export default ProsAgendaView;

type CreateAppointmentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  services: Service[];
  defaultServiceId: string | null;
  timeOptions: string[];
  isSubmitting: boolean;
  onSubmit: (values: CreateFormValues) => Promise<void>;
};

const CreateAppointmentDialog = ({
  open,
  onOpenChange,
  date,
  services,
  defaultServiceId,
  timeOptions,
  isSubmitting,
  onSubmit,
}: CreateAppointmentDialogProps) => {
  const [serviceId, setServiceId] = useState<string>(defaultServiceId ?? '');
  const [time, setTime] = useState('10:00');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setServiceId(defaultServiceId ?? services[0]?.id ?? '');
    setTime('10:00');
    setClientName('');
    setClientPhone('');
    setClientEmail('');
    setNotes('');
    setError(null);
  }, [open, defaultServiceId, services]);

  const selectedService = services.find((service) => service.id === serviceId) ?? services[0];

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedService) {
      setError('Selecciona un servicio para programar la cita.');
      return;
    }
    if (clientName.trim().length < 2) {
      setError('Introduce el nombre de la persona para registrar la cita.');
      return;
    }

    setError(null);
    try {
      await onSubmit({
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        durationMinutes: selectedService.duration_min,
        time,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim() || undefined,
        clientEmail: clientEmail.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la cita.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-slate-950/95 text-white">
        <DialogHeader className="space-y-2">
          <DialogTitle>Crear cita</DialogTitle>
          <DialogDescription className="text-white/70">
            Registra una nueva cita para el {formatDialogDate(date)}.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="service">Servicio</Label>
            <Select value={serviceId} onValueChange={setServiceId} disabled={services.length === 0 || isSubmitting}>
              <SelectTrigger id="service" className="border-white/15 bg-white/5 text-white">
                <SelectValue placeholder="Selecciona un servicio" />
              </SelectTrigger>
              <SelectContent className="border-white/15 bg-slate-900/95 text-white">
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="time">Hora de inicio</Label>
              <Select value={time} onValueChange={setTime} disabled={isSubmitting}>
                <SelectTrigger id="time" className="border-white/15 bg-white/5 text-white">
                  <SelectValue placeholder="Elige una hora" />
                </SelectTrigger>
                <SelectContent className="border-white/15 bg-slate-900/95 text-white">
                  {timeOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option} h
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-name">Nombre de la persona</Label>
              <Input
                id="client-name"
                value={clientName}
                onChange={(event) => setClientName(event.target.value)}
                placeholder="Nombre y apellidos"
                className="border-white/15 bg-white/5 text-white placeholder:text-white/40"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="client-phone">Teléfono de contacto</Label>
              <Input
                id="client-phone"
                value={clientPhone}
                onChange={(event) => setClientPhone(event.target.value)}
                placeholder="+34 600 000 000"
                className="border-white/15 bg-white/5 text-white placeholder:text-white/40"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-email">Correo electrónico (opcional)</Label>
              <Input
                id="client-email"
                type="email"
                value={clientEmail}
                onChange={(event) => setClientEmail(event.target.value)}
                placeholder="cliente@correo.com"
                className="border-white/15 bg-white/5 text-white placeholder:text-white/40"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas internas</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Preferencias o recordatorios para el equipo"
              className="min-h-[96px] border-white/15 bg-white/5 text-white placeholder:text-white/40"
              disabled={isSubmitting}
            />
          </div>

          {error && <p className="text-sm text-rose-300">{error}</p>}

          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="rounded-full border-white/20 text-white/80 hover:bg-white/10"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="rounded-full bg-emerald-500 px-5 text-sm font-semibold text-emerald-950 hover:bg-emerald-400"
              disabled={isSubmitting || services.length === 0}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando
                </span>
              ) : (
                'Guardar cita'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

type RescheduleAppointmentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment | null;
  service?: Service;
  timeOptions: string[];
  isSubmitting: boolean;
  onSubmit: (values: RescheduleFormValues) => Promise<void>;
};

const RescheduleAppointmentDialog = ({
  open,
  onOpenChange,
  appointment,
  service,
  timeOptions,
  isSubmitting,
  onSubmit,
}: RescheduleAppointmentDialogProps) => {
  const [time, setTime] = useState(appointment?.time ?? '10:00');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTime(appointment?.time ?? '10:00');
    setError(null);
  }, [open, appointment?.time]);

  if (!appointment) return null;

  const durationMinutes = appointment.durationMinutes ?? service?.duration_min ?? 45;
  const appointmentDate = new Date(`${appointment.date}T00:00:00`);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    try {
      await onSubmit({ newTime: time, durationMinutes });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo reprogramar la cita.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-white/10 bg-slate-950/95 text-white">
        <DialogHeader className="space-y-2 text-left">
          <DialogTitle>Reprogramar cita</DialogTitle>
          <DialogDescription className="text-white/70">
            Ajusta la hora para {appointment.client} ({formatDialogDate(appointmentDate)}).
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="new-time">Nueva hora</Label>
            <Select value={time} onValueChange={setTime} disabled={isSubmitting}>
              <SelectTrigger id="new-time" className="border-white/15 bg-white/5 text-white">
                <SelectValue placeholder="Selecciona una hora" />
              </SelectTrigger>
              <SelectContent className="border-white/15 bg-slate-900/95 text-white">
                {timeOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option} h
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-white/40">Duración estimada: {durationMinutes} minutos.</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
            <p className="text-base font-semibold text-white">{appointment.service}</p>
            <p>{appointment.client}</p>
            {(appointment.clientPhone || appointment.clientEmail) && (
              <p className="text-xs text-white/60">
                {[appointment.clientPhone, appointment.clientEmail].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>

          {error && <p className="text-sm text-rose-300">{error}</p>}

          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="rounded-full border-white/20 text-white/80 hover:bg-white/10"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="rounded-full bg-emerald-500 px-5 text-sm font-semibold text-emerald-950 hover:bg-emerald-400"
              disabled={isSubmitting}
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
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

type CancelAppointmentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment | null;
  service?: Service;
  isSubmitting: boolean;
  onConfirm: () => Promise<void>;
};

const CancelAppointmentDialog = ({
  open,
  onOpenChange,
  appointment,
  service,
  isSubmitting,
  onConfirm,
}: CancelAppointmentDialogProps) => {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) setError(null);
  }, [open]);

  if (!appointment) return null;

  const appointmentDate = new Date(`${appointment.date}T00:00:00`);

  const handleConfirm = async () => {
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cancelar la cita.');
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="border-white/10 bg-slate-950/95 text-white">
        <AlertDialogHeader className="space-y-2 text-left">
          <AlertDialogTitle>Cancelar cita</AlertDialogTitle>
          <AlertDialogDescription className="text-white/70">
            ¿Quieres cancelar la cita de {appointment.client} el {formatDialogDate(appointmentDate)} a las {appointment.time} h?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
          <p className="text-base font-semibold text-white">{appointment.service}</p>
          {service && <p>Duración estimada: {service.duration_min} minutos.</p>}
          {(appointment.clientPhone || appointment.clientEmail) && (
            <p className="text-xs text-white/60">
              {[appointment.clientPhone, appointment.clientEmail].filter(Boolean).join(' · ')}
            </p>
          )}
          {appointment.notes && <p className="text-xs text-white/60">Notas: {appointment.notes}</p>}
        </div>
        {error && <p className="text-sm text-rose-300">{error}</p>}
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
          <AlertDialogCancel className="rounded-full border-white/20 bg-transparent text-white/80 hover:bg-white/10" disabled={isSubmitting}>
            Mantener cita
          </AlertDialogCancel>
          <Button
            type="button"
            className="rounded-full bg-rose-500 px-5 text-sm font-semibold text-rose-50 hover:bg-rose-400"
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cancelando
              </span>
            ) : (
              'Cancelar cita'
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
