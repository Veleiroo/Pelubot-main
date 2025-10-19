import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, isValid, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Mail,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { api, ApiError, type Service } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useProSession } from '@/store/pro';
import { STATUS_STYLES } from '../shared/constants';
import type { AgendaSummary, Appointment } from '../shared/types';
import { useAgendaActions } from './hooks/useAgendaActions';
import { useAgendaData } from './hooks/useAgendaData';
import { useAgendaState } from './hooks/useAgendaState';

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

const capitalize = (value: string) => (value ? value.charAt(0).toUpperCase() + value.slice(1) : value);

const STATUS_BORDER_ACCENTS: Record<Appointment['status'], string> = {
  confirmada: 'border-l-emerald-400',
  asistida: 'border-l-green-600',
  no_asistida: 'border-l-red-400',
  cancelada: 'border-l-rose-400',
};

const timeRangeLabel = (appointment: Appointment) =>
  appointment.endTime ? `${appointment.time} h · ${appointment.endTime} h` : `${appointment.time} h`;

const contactLabel = (appointment: Appointment) => {
  const phone = appointment.clientPhone?.trim();
  const email = appointment.clientEmail?.trim();
  if (!phone && !email) return null;
  return { phone, email };
};

export const ProsAgendaView = () => {
  const { toast } = useToast();
  const { session } = useProSession();
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

  const defaultServiceId = availableServices[0]?.id ?? null;

  const {
    createAppointment,
    rescheduleAppointment,
    cancelAppointment,
    isCreating,
    isRescheduling,
    isCancelling,
  } = useAgendaActions({ professionalId: stylist?.id });

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
              'bg-primary text-primary-foreground shadow-[0_8px_20px_rgba(47,129,237,0.35)] hover:bg-primary rounded-full',
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
              'relative inline-flex h-11 w-11 items-center justify-center rounded-full text-sm font-medium text-muted-foreground transition-colors hover:bg-primary/20 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            day_selected:
              'bg-primary text-primary-foreground font-semibold shadow-[0_8px_20px_rgba(47,129,237,0.35)] hover:bg-primary rounded-full',
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
            <span className="text-emerald-500">{totals.confirmadas} confirmadas</span>
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
        <Button onClick={onCreate} className="gap-2 bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          Crear cita
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <div className="flex gap-2">
          {[
            { key: 'all', label: 'Todas' },
            { key: 'confirmada', label: 'Confirmadas' },
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
                      <Badge
                        className={cn(
                          'rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide',
                          STATUS_STYLES[appointment.status]
                        )}
                      >
                        {appointment.status.toUpperCase()}
                      </Badge>
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
                        {contactInfo.email ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5" />
                            {contactInfo.email}
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
      <DialogContent className="max-w-[calc(100%-2rem)] border-white/10 bg-slate-950/95 text-white sm:max-w-lg">
        <DialogHeader className="space-y-1.5 sm:space-y-2">
          <DialogTitle className="text-lg sm:text-xl">Crear cita</DialogTitle>
          <DialogDescription className="text-xs text-white/70 sm:text-sm">
            Registra una nueva cita para el {formatDialogDate(date)}.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4 sm:space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="service" className="text-xs sm:text-sm">
              Servicio
            </Label>
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

          <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="time" className="text-xs sm:text-sm">
                Hora de inicio
              </Label>
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
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="client-name" className="text-xs sm:text-sm">
                Nombre de la persona
              </Label>
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

          <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="client-phone" className="text-xs sm:text-sm">
                Teléfono de contacto
              </Label>
              <Input
                id="client-phone"
                value={clientPhone}
                onChange={(event) => setClientPhone(event.target.value)}
                placeholder="+34 600 000 000"
                className="border-white/15 bg-white/5 text-white placeholder:text-white/40"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="client-email" className="text-xs sm:text-sm">
                Correo electrónico (opcional)
              </Label>
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

          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="notes" className="text-xs sm:text-sm">
              Notas internas
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Preferencias o recordatorios para el equipo"
              className="min-h-[80px] border-white/15 bg-white/5 text-sm text-white placeholder:text-white/40 sm:min-h-[96px]"
              disabled={isSubmitting}
            />
          </div>

          {error && <p className="text-xs text-rose-300 sm:text-sm">{error}</p>}

          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
      <DialogContent className="max-w-[calc(100%-2rem)] border-white/10 bg-slate-950/95 text-white sm:max-w-lg">
        <DialogHeader className="space-y-1.5 text-left sm:space-y-2">
          <DialogTitle className="text-lg sm:text-xl">Reprogramar cita</DialogTitle>
          <DialogDescription className="text-xs text-white/70 sm:text-sm">
            Ajusta la hora para {appointment.client} ({formatDialogDate(appointmentDate)}).
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4 sm:space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="new-time" className="text-xs sm:text-sm">
              Nueva hora
            </Label>
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

          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
          {(appointment.clientPhone || appointment.clientEmail) && (
            <p className="text-[10px] text-white/60 sm:text-xs">
              {[appointment.clientPhone, appointment.clientEmail].filter(Boolean).join(' · ')}
            </p>
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
