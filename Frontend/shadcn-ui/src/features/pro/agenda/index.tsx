import { useLayoutEffect, useRef, useState } from 'react';
import { Loader2, RefreshCcw } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useProSession } from '@/store/pro';

import { MIN_APPOINTMENTS_CARD_HEIGHT } from '../shared/constants';
import type { Appointment } from '../shared/types';
import { AppointmentsCard } from './components/appointments-card';
import { CalendarCard } from './components/calendar-card';
import { useAgendaData } from './hooks/useAgendaData';
import { useAgendaState } from './hooks/useAgendaState';

export const ProsAgendaView = () => {
  const { toast } = useToast();
  const { session } = useProSession();
  const layoutRef = useRef<HTMLElement>(null);
  const calendarCardRef = useRef<HTMLDivElement>(null);
  const appointmentsCardRef = useRef<HTMLDivElement>(null);
  const [appointmentsCardHeight, setAppointmentsCardHeight] = useState<number | null>(null);

  const stylist = session?.stylist;
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
  } = useAgendaState(appointments);

  const handlePrevNav = () => {
    if (disablePrevNav) return;
    goToMonth(previousMonthCandidate);
  };

  const handleNextNav = () => {
    if (disableNextNav) return;
    goToMonth(nextMonthCandidate);
  };

  const handleAppointmentAction = (action: 'reschedule' | 'cancel', appointment: Appointment) => {
    const labels = {
      reschedule: 'Reprogramación en camino',
      cancel: 'Cancelación pendiente',
    } as const;

    const details = {
      reschedule: `Pronto podrás mover la cita de ${appointment.client} (${appointment.time} h).`,
      cancel: `Registraremos la cancelación de ${appointment.client} (${appointment.time} h).`,
    } as const;

    toast({ title: labels[action], description: details[action] });
  };

  const handleCreate = () => {
    toast({
      title: 'Nueva cita',
      description: `Abriremos el flujo para crear una cita el ${dayLabel}.`,
    });
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

  return (
    <section ref={layoutRef} className="space-y-5">
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

      <div className={cn('grid gap-6', 'xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]')}>
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
        />

        <AppointmentsCard
          ref={appointmentsCardRef}
          dayLabel={dayLabel}
          summary={summary}
          appointments={selectedAppointments}
          onCreate={handleCreate}
          onAction={handleAppointmentAction}
          minHeight={MIN_APPOINTMENTS_CARD_HEIGHT}
          height={computedHeight}
        />
      </div>
    </section>
  );
};

export default ProsAgendaView;
