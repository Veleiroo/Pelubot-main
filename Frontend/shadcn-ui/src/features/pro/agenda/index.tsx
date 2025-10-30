import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, isValid, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Phone,
  Plus,
  RefreshCcw,
  Filter,
  Trash2,
} from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { api, ApiError, type Service } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useProSession } from '@/store/pro';
import { AppointmentStatusPill } from '../shared/components/appointment-status-pill';
import {
  RescheduleAppointmentDialog,
  RESCHEDULE_TIME_OPTIONS,
  type RescheduleFormValues,
} from '../shared/components/reschedule-appointment-dialog';
import { NewAppointmentModal, type NewAppointmentFormValues } from '../overview/components/new-appointment-modal';
import type { AgendaSummary, Appointment } from '../shared/types';
import { ReservationHistoryCard } from './components/ReservationHistoryCard';
import { useAgendaActions } from './hooks/useAgendaActions';
import { useAgendaData } from './hooks/useAgendaData';
import { useAgendaState } from './hooks/useAgendaState';

const formatDialogDate = (date: Date) => format(date, "EEEE d 'de' MMMM", { locale: es });

const toErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof ApiError) return error.detail || error.message || fallback;
  if (error instanceof Error) return error.message || fallback;
  return fallback;
};

const capitalize = (value: string) => (value ? value.charAt(0).toUpperCase() + value.slice(1) : value);

const STATUS_BORDER_ACCENTS: Record<Appointment['status'], string> = {
  confirmada: 'border-l-amber-400',
  asistida: 'border-l-emerald-500',
  no_asistida: 'border-l-red-400',
  cancelada: 'border-l-rose-400',
};


const timeRangeLabel = (appointment: Appointment) =>
  appointment.endTime ? `${appointment.time} h · ${appointment.endTime} h` : `${appointment.time} h`;

const contactLabel = (appointment: Appointment) => {
  const phone = appointment.clientPhone?.trim();
  if (!phone) return null;
  return { phone };
};

export const ProsAgendaView = () => {
  const { toast } = useToast();
  const { session } = useProSession();
  const location = useLocation();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);

  const stylist = session?.stylist;

  const { data: servicesData, isLoading: isLoadingServices } = useQuery({
    queryKey: ['services'],
    queryFn: api.getServices,
    staleTime: 300_000,
    enabled: Boolean(stylist),
  });

  const { appointments, isLoading, isFetching, errorMessage, refetch } = useAgendaData(Boolean(stylist));

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

  const {
    createAppointment,
    rescheduleAppointment,
    cancelAppointment,
    isRescheduling,
    isCancelling,
  } = useAgendaActions({ professionalId: stylist?.id });

  useEffect(() => {
    const state = location.state as { newAppointment?: boolean } | undefined;
    if (state?.newAppointment) {
      setCreateOpen(true);
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);

  const formattedDayLabel = useMemo(() => capitalize(dayLabel), [dayLabel]);
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
    if (!isLoadingServices && availableServices.length === 0) {
      toast({
        title: 'No hay servicios configurados',
        description: 'Configura al menos un servicio para poder crear nuevas citas.',
        variant: 'destructive',
      });
      return;
    }
    setCreateOpen(true);
  };

  const handleCreateConfirm = async (values: NewAppointmentFormValues) => {
    const targetDate = (() => {
      if (values.date) {
        const parsed = new Date(`${values.date}T00:00:00`);
        if (!Number.isNaN(parsed.getTime())) return parsed;
      }
      return selectedDate ?? new Date();
    })();
    try {
      await createAppointment({
        date: targetDate,
        time: values.time,
        serviceId: values.serviceId,
        serviceName: values.serviceName,
        durationMinutes: values.durationMinutes,
        clientName: values.client,
        clientPhone: values.clientPhone,
        notes: values.notes,
      });
      toast({
        title: 'Cita creada',
        description: `${values.client} tiene cita el ${formatDialogDate(targetDate)} a las ${values.time} h.`,
      });
    } catch (error) {
      const message = toErrorMessage(error, 'No se pudo crear la cita. Inténtalo de nuevo.');
      toast({ title: 'No se pudo crear la cita', description: message, variant: 'destructive' });
      throw new Error(message);
    }
  };

  const handleRescheduleSubmit = async (values: RescheduleFormValues) => {
    const target = rescheduleTarget;
    if (!target) return;
    const appointmentDate = (() => {
      if (values.newDate) {
        const parsed = new Date(`${values.newDate}T00:00:00`);
        if (!Number.isNaN(parsed.getTime())) {
          return parsed;
        }
      }
      return new Date(`${target.date}T00:00:00`);
    })();
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

  if (!stylist) {
    return (
      <section className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-muted-foreground">
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
    <>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">Agenda</h1>
            <p className="text-sm text-muted-foreground">
              Gestiona tus citas diarias y mantén al día la planificación de tu equipo.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className={cn(
                'gap-2 border-border/60 bg-transparent text-sm font-semibold text-muted-foreground transition hover:bg-muted/30',
                isFetching ? 'cursor-wait opacity-80' : ''
              )}
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCcw className={cn('h-4 w-4', isFetching ? 'animate-spin' : '')} />
              Actualizar
            </Button>
            <Button
              onClick={handleCreateClick}
              className="gap-2 bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Nueva cita
            </Button>
          </div>
        </header>

        {errorMessage ? (
          <Alert variant="destructive" className="border-red-500/50 bg-red-500/15 text-red-100 backdrop-blur">
            <AlertTitle className="font-bold">No pudimos cargar tu agenda</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        {isLoading && appointments.length === 0 ? (
          <div className="flex items-center justify-center gap-3 rounded-2xl border border-border/60 bg-muted/30 px-6 py-4 text-base text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="font-medium">Cargando tu agenda...</span>
          </div>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
          <AgendaCalendarPanel
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
          />

          <AppointmentsListPanel
            dayLabel={formattedDayLabel}
            summary={summary}
            appointments={selectedAppointments}
            isToday={isTodaySelected}
            isFetching={isFetching}
            onCreate={handleCreateClick}
            onAction={handleAppointmentAction}
          />
        </section>

        <ReservationHistoryCard
          services={availableServices}
          onAction={handleAppointmentAction}
          isRescheduling={isRescheduling}
          isCancelling={isCancelling}
        />
      </div>

      <NewAppointmentModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        suggestedDate={selectedDate ?? new Date()}
        services={availableServices}
        servicesLoading={isLoadingServices}
        onConfirm={handleCreateConfirm}
      />

      <RescheduleAppointmentDialog
        open={Boolean(rescheduleTarget)}
        onOpenChange={(open) => {
          if (!open) setRescheduleTarget(null);
        }}
        appointment={rescheduleTarget}
        service={rescheduleService}
        timeOptions={RESCHEDULE_TIME_OPTIONS}
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
    </>
  );
};

export default ProsAgendaView;

type AgendaCalendarPanelProps = {
  selectedDate: Date;
  currentMonth: Date;
  today: Date;
  busyDates: Date[];
  fromMonth: Date;
  toMonth: Date;
  disablePrev: boolean;
  disableNext: boolean;
  onSelectDay: (day?: Date) => void;
  onMonthChange: (month: Date) => void;
  onPrev: () => void;
  onNext: () => void;
};

const AgendaCalendarPanel = ({
  selectedDate,
  currentMonth,
  today,
  busyDates,
  fromMonth,
  toMonth,
  disablePrev,
  disableNext,
  onSelectDay,
  onMonthChange,
  onPrev,
  onNext,
}: AgendaCalendarPanelProps) => {
  const [highlightBusy, setHighlightBusy] = useState(true);

  const busyModifierDates = useMemo(() => (highlightBusy ? busyDates : []), [busyDates, highlightBusy]);

  const monthLabel = useMemo(() => {
    const monthName = currentMonth.toLocaleDateString('es-ES', { month: 'long' });
    return `${capitalize(monthName)} ${currentMonth.getFullYear()}`;
  }, [currentMonth]);

  return (
    <Card className="flex h-full flex-col gap-4 border border-border/50 bg-card p-4 shadow-lg">
      <div className="space-y-4">
        <div className="space-y-2 text-center">
          <h2 className="text-3xl font-semibold text-foreground">Calendario</h2>
          <p className="text-sm text-muted-foreground">
            Selecciona un día para revisar o añadir citas.
          </p>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border/50 bg-secondary px-2 py-1 text-muted-foreground">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:opacity-40"
            onClick={onPrev}
            disabled={disablePrev}
            aria-label="Mes anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-4 text-lg font-semibold capitalize tracking-tight text-foreground">{monthLabel}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:opacity-40"
            onClick={onNext}
            disabled={disableNext}
            aria-label="Mes siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Calendar
          mode="single"
          selected={selectedDate}
          month={currentMonth}
          onSelect={onSelectDay}
          onMonthChange={onMonthChange}
          fromMonth={fromMonth}
          toMonth={toMonth}
          showOutsideDays
          modifiers={{
            busy: busyModifierDates,
            today: today ? [today] : [],
          }}
          modifiersClassNames={{
            busy:
              'after:absolute after:bottom-2 after:left-1/2 after:h-1.5 after:w-1.5 after:-translate-x-1/2 after:rounded-full after:bg-primary/80 after:content-[""]',
            today: 'border border-primary/50 text-primary',
            selected:
              'rounded-full bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            outside: 'pointer-events-none text-muted-foreground/40',
            disabled: 'pointer-events-none opacity-40',
          }}
          className="w-full"
          classNames={{
            months: 'flex w-full flex-col gap-4',
            month: 'space-y-4',
            caption: 'hidden',
            month_caption: 'sr-only',
            caption_label: 'sr-only',
            month_grid: 'space-y-2',
            weekdays:
              'grid grid-cols-7 text-center text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:text-[0.7rem]',
            weekday: 'py-2',
            week: 'grid grid-cols-7 gap-1',
            day: 'flex items-center justify-center',
            day_button:
              'relative inline-flex h-11 w-11 items-center justify-center rounded-full text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            day_selected:
              'rounded-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            day_today: 'border border-primary/50 text-primary',
            day_outside: 'pointer-events-none text-muted-foreground/40',
            day_disabled: 'pointer-events-none opacity-40',
            day_hidden: 'invisible',
            nav: 'hidden',
          }}
        />
      </div>

      <div className="flex items-center justify-between border-t border-border/50 pt-4">
        <label htmlFor="agenda-toggle" className="text-sm font-medium text-foreground">
          Días con citas
        </label>
        <Switch
          id="agenda-toggle"
          checked={highlightBusy}
          onCheckedChange={setHighlightBusy}
        />
      </div>
    </Card>
  );
};

type AppointmentsListPanelProps = {
  dayLabel: string;
  summary: AgendaSummary;
  appointments: Appointment[];
  isToday: boolean;
  isFetching: boolean;
  onCreate: () => void;
  onAction: (action: 'reschedule' | 'cancel', appointment: Appointment) => void;
};

const AppointmentsListPanel = ({
  dayLabel,
  summary,
  appointments,
  isToday,
  isFetching,
  onCreate,
  onAction,
}: AppointmentsListPanelProps) => {
  const [filter, setFilter] = useState<'all' | 'confirmada' | 'pendiente' | 'cancelada'>('all');

  const filteredAppointments = useMemo(() => {
    if (filter === 'all') return appointments;
    return appointments.filter((appointment) => appointment.status === filter);
  }, [appointments, filter]);

  const contact = (appointment: Appointment) => contactLabel(appointment);

  const totals = {
    confirmadas: summary.confirmadas,
    asistidas: summary.asistidas,
    no_asistidas: summary.no_asistidas,
    canceladas: summary.canceladas,
  };

  return (
    <Card className="flex h-full flex-col gap-4 border border-border/50 bg-card p-4 shadow-lg">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border/50 pb-3">
        <div>
          <h2 className="text-2xl font-semibold capitalize text-foreground">{dayLabel}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="text-foreground font-medium">
              {appointments.length} {appointments.length === 1 ? 'cita' : 'citas'}
            </span>
            <span>•</span>
            <span className="text-amber-600">{totals.confirmadas} pendientes</span>
            {totals.asistidas > 0 && (
              <>
                <span>•</span>
                <span className="text-green-600">{totals.asistidas} asistidas</span>
              </>
            )}
            {totals.no_asistidas > 0 && (
              <>
                <span>•</span>
                <span className="text-red-500">{totals.no_asistidas} no asistidas</span>
              </>
            )}
            {totals.canceladas > 0 ? (
              <>
                <span>•</span>
                <span className="text-rose-500">{totals.canceladas} canceladas</span>
              </>
            ) : null}
            {isToday ? (
              <>
                <span>•</span>
                <Badge variant="outline" className="border-primary/40 text-primary">
                  Hoy
                </Badge>
              </>
            ) : null}
            {isFetching ? (
              <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Actualizando...
              </span>
            ) : null}
          </div>
        </div>
        <Button onClick={onCreate} variant="primaryAction">
          <Plus className="h-4 w-4" />
          Crear cita
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <div className="flex gap-2">
          {[
            { key: 'all', label: 'Todas' },
            { key: 'confirmada', label: 'Pendientes' },
            { key: 'asistida', label: 'Asistidas' },
            { key: 'cancelada', label: 'Canceladas' },
          ].map((item) => (
            <Button
              key={item.key}
              size="sm"
              variant={filter === item.key ? 'default' : 'outline'}
              className={cn('h-8 px-3 text-xs', filter === item.key ? 'bg-primary hover:bg-primary/90 text-primary-foreground' : 'bg-transparent hover:bg-secondary/60')}
              onClick={() => setFilter(item.key as typeof filter)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {filteredAppointments.length > 0 ? (
        <div className="space-y-3 overflow-y-auto pr-1">
          {filteredAppointments.map((appointment) => {
            const contactInfo = contact(appointment);

            return (
              <div
                key={appointment.id}
                className={cn(
                  'border border-border/40 bg-secondary/30 p-4 transition hover:bg-secondary/50',
                  'border-l-4',
                  STATUS_BORDER_ACCENTS[appointment.status]
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-2 font-medium text-foreground">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {timeRangeLabel(appointment)}
                      </span>
                      <AppointmentStatusPill
                        status={appointment.status}
                        className="text-[11px]"
                        labelClassName="font-semibold"
                      />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-foreground">{appointment.client}</p>
                      <p className="text-sm text-muted-foreground">{appointment.service}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-3 text-xs font-medium text-muted-foreground transition hover:bg-secondary hover:text-primary"
                      onClick={() => onAction('reschedule', appointment)}
                    >
                      <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                      Reprogramar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-3 text-xs font-medium text-rose-500 transition hover:bg-rose-500/10"
                      onClick={() => onAction('cancel', appointment)}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      Cancelar
                    </Button>
                  </div>
                </div>

                {contactInfo || appointment.notes ? (
                  <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                    {contactInfo ? (
                      <div className="flex flex-wrap items-center gap-4">
                        {contactInfo.phone ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5" />
                            {contactInfo.phone}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                    {appointment.notes ? (
                      <p className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
                        Notas: {appointment.notes}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-secondary/30 p-10 text-center">
          <p className="text-4xl">📅</p>
          <p className="mt-3 text-lg font-semibold text-foreground">No hay citas programadas</p>
          <p className="text-sm text-muted-foreground">
            Crea una nueva reserva para este día desde el botón superior.
          </p>
        </div>
      )}
    </Card>
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
      <AlertDialogContent className="max-w-[calc(100%-2rem)] border-white/10 bg-slate-950/95 text-white sm:max-w-lg">
        <AlertDialogHeader className="space-y-1.5 text-left sm:space-y-2">
          <AlertDialogTitle className="text-lg sm:text-xl">Cancelar cita</AlertDialogTitle>
          <AlertDialogDescription className="text-xs text-white/70 sm:text-sm">
            ¿Quieres cancelar la cita de {appointment.client} el {formatDialogDate(appointmentDate)} a las {appointment.time} h?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/80 sm:rounded-2xl sm:p-4 sm:text-sm">
          <p className="text-sm font-semibold text-white sm:text-base">{appointment.service}</p>
          {service && <p>Duración estimada: {service.duration_min} minutos.</p>}
          {appointment.clientPhone && (
            <p className="text-[10px] text-white/60 sm:text-xs">{appointment.clientPhone}</p>
          )}
          {appointment.notes && <p className="text-[10px] text-white/60 sm:text-xs">Notas: {appointment.notes}</p>}
        </div>
        {error && <p className="text-xs text-rose-300 sm:text-sm">{error}</p>}
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
          <AlertDialogCancel className="rounded-full border-white/20 bg-transparent text-sm text-white/80 hover:bg-white/10" disabled={isSubmitting}>
            Mantener cita
          </AlertDialogCancel>
          <Button
            type="button"
            className="rounded-full bg-rose-500 px-4 text-sm font-semibold text-rose-50 hover:bg-rose-400 sm:px-5"
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
