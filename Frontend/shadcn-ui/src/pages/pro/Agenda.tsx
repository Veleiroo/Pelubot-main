import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { addMonths, compareAsc, format, parseISO, startOfDay, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

type AppointmentStatus = 'confirmada' | 'pendiente' | 'cancelada';

type Appointment = {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  client: string;
  service: string;
  status: AppointmentStatus;
  notes?: string;
};

const MOCK_APPOINTMENTS: Appointment[] = [
  { id: 'apt-101', date: '2025-10-04', time: '09:30', client: 'Laura Pérez', service: 'Corte y peinado', status: 'confirmada', notes: 'Prefiere acabado con ondas suaves.' },
  { id: 'apt-102', date: '2025-10-04', time: '11:15', client: 'Sara Núñez', service: 'Recogido evento', status: 'pendiente' },
  { id: 'apt-103', date: '2025-10-04', time: '13:00', client: 'Marta López', service: 'Coloración parcial', status: 'confirmada' },
  { id: 'apt-104', date: '2025-10-04', time: '18:30', client: 'Andrea Vidal', service: 'Tratamiento hidratante', status: 'cancelada' },
  { id: 'apt-105', date: '2025-10-05', time: '09:45', client: 'Claudia Ramos', service: 'Balayage completo', status: 'confirmada' },
  { id: 'apt-106', date: '2025-10-05', time: '12:00', client: 'Lorena Díaz', service: 'Manicura + Spa', status: 'pendiente' },
  { id: 'apt-107', date: '2025-10-07', time: '16:15', client: 'Paula García', service: 'Tratamiento brillo', status: 'confirmada' },
  { id: 'apt-108', date: '2025-10-09', time: '10:00', client: 'Helena Crespo', service: 'Corte + styling', status: 'pendiente' },
  { id: 'apt-109', date: '2025-10-09', time: '17:45', client: 'Elena Vives', service: 'Recogido boda', status: 'confirmada' },
  { id: 'apt-110', date: '2025-10-11', time: '19:00', client: 'Patricia Gómez', service: 'Tratamiento keratina', status: 'confirmada' },
  { id: 'apt-111', date: '2025-10-12', time: '09:00', client: 'Isabel Torres', service: 'Corte pixie', status: 'pendiente' },
  { id: 'apt-112', date: '2025-10-12', time: '11:30', client: 'Carmen Oliva', service: 'Extensiones parciales', status: 'cancelada' },
  { id: 'apt-113', date: '2025-10-14', time: '15:15', client: 'Blanca Sanz', service: 'Color fantasy', status: 'confirmada' },
  { id: 'apt-114', date: '2025-10-16', time: '10:45', client: 'María Costa', service: 'Corte y masaje capilar', status: 'confirmada' },
  { id: 'apt-115', date: '2025-10-19', time: '17:00', client: 'Nerea Varela', service: 'Recogido ceremonia', status: 'pendiente' },
  { id: 'apt-116', date: '2025-10-20', time: '09:30', client: 'Silvia Vidal', service: 'Corte + hidratación', status: 'confirmada' },
  { id: 'apt-117', date: '2025-10-20', time: '12:45', client: 'Olga Pérez', service: 'Coloración completa', status: 'pendiente' },
  { id: 'apt-118', date: '2025-10-20', time: '18:15', client: 'Andrea Núñez', service: 'Tratamiento detox', status: 'confirmada' },
  { id: 'apt-119', date: '2025-10-23', time: '11:30', client: 'Julia Moreno', service: 'Corte bob', status: 'confirmada' },
  { id: 'apt-120', date: '2025-10-25', time: '10:30', client: 'Noelia Ruiz', service: 'Color raíz + matiz', status: 'pendiente' },
  { id: 'apt-121', date: '2025-10-25', time: '13:00', client: 'Cristina Lara', service: 'Peinado invitada', status: 'confirmada' },
  { id: 'apt-122', date: '2025-10-27', time: '09:15', client: 'Rocío Salas', service: 'Corte + styling', status: 'confirmada' },
  { id: 'apt-123', date: '2025-10-30', time: '18:45', client: 'Gemma Roca', service: 'Recogido elegante', status: 'confirmada' },
];

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  confirmada: 'bg-emerald-400/15 text-emerald-200 ring-1 ring-emerald-400/30',
  pendiente: 'bg-amber-400/15 text-amber-200 ring-1 ring-amber-400/30',
  cancelada: 'bg-rose-400/15 text-rose-200 ring-1 ring-rose-400/30',
};

const ProsAgenda = () => {
  const { toast } = useToast();
  const layoutRef = useRef<HTMLDivElement>(null);
  const calendarCardRef = useRef<HTMLDivElement>(null);
  const agendaCardRef = useRef<HTMLDivElement>(null);
  const [agendaCardHeight, setAgendaCardHeight] = useState<number | null>(null);

  const { appointmentsByDate, busyDates, sortedDates } = useMemo(() => {
    const sorted = [...MOCK_APPOINTMENTS].sort((a, b) => {
      const dateCompare = compareAsc(parseISO(a.date), parseISO(b.date));
      if (dateCompare !== 0) return dateCompare;
      return a.time.localeCompare(b.time);
    });

    const record: Record<string, Appointment[]> = {};
    for (const appointment of sorted) {
      if (!record[appointment.date]) record[appointment.date] = [];
      record[appointment.date].push(appointment);
    }

    const dates = Object.keys(record).sort();
    const busy = dates.map((iso) => parseISO(iso));

    return { appointmentsByDate: record, busyDates: busy, sortedDates: dates };
  }, []);

  const today = useMemo(() => startOfDay(new Date()), []);

  const initialSelectedDate = useMemo(() => {
    const todayKey = format(today, 'yyyy-MM-dd');
    if (appointmentsByDate[todayKey]) return today;
    if (sortedDates.length > 0) return startOfDay(parseISO(sortedDates[0]));
    return today;
  }, [appointmentsByDate, sortedDates, today]);

  const [selectedDate, setSelectedDate] = useState<Date>(initialSelectedDate);
  const [currentMonth, setCurrentMonth] = useState<Date>(() => startOfMonth(initialSelectedDate));

  const selectedKey = format(selectedDate, 'yyyy-MM-dd');
  const selectedAppointments = useMemo(
    () => appointmentsByDate[selectedKey] ?? [],
    [appointmentsByDate, selectedKey]
  );

  const dayLabel = useMemo(
    () => format(selectedDate, "EEEE d 'de' MMMM", { locale: es }),
    [selectedDate]
  );

  const summary = useMemo(() => {
    const total = selectedAppointments.length;
    return {
      total,
      confirmadas: selectedAppointments.filter((apt) => apt.status === 'confirmada').length,
      pendientes: selectedAppointments.filter((apt) => apt.status === 'pendiente').length,
      canceladas: selectedAppointments.filter((apt) => apt.status === 'cancelada').length,
    };
  }, [selectedAppointments]);

  const handleSelectDay = (day?: Date) => {
    if (!day) return;
    const normalized = startOfDay(day);
    setSelectedDate(normalized);
    setCurrentMonth(startOfMonth(normalized));
  };

  const handleMonthChange = (nextMonth: Date) => {
    setCurrentMonth(startOfMonth(nextMonth));
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

    toast({
      title: labels[action],
      description: details[action],
    });
  };

  const handleCreate = () => {
    toast({
      title: 'Nueva cita',
      description: `Abriremos el flujo para crear una cita el ${dayLabel}.`,
    });
  };

  const fromMonth = useMemo(() => {
    const base = startOfMonth(new Date());
    return addMonths(base, -3);
  }, []);

  const toMonth = useMemo(() => {
    const base = startOfMonth(new Date());
    return addMonths(base, 6);
  }, []);

  useLayoutEffect(() => {
    const recalc = () => {
      const root = layoutRef.current;
      const calendarCard = calendarCardRef.current;
      const agendaCard = agendaCardRef.current;
      const isDesktop = window.innerWidth >= 1280; // xl breakpoint
      if (!root || !calendarCard || !agendaCard || !isDesktop) {
        setAgendaCardHeight(null);
        return;
      }

      const viewportHeight = window.innerHeight;
      const rootRect = root.getBoundingClientRect();
      const cardRect = calendarCard.getBoundingClientRect();
      const gap = 24; // gap between the two cards
      const buffer = 40; // bottom breathing room

      const available = viewportHeight - rootRect.top - cardRect.height - gap - buffer;
      if (!Number.isFinite(available) || available <= 320) {
        setAgendaCardHeight(null);
        return;
      }

      setAgendaCardHeight(Math.min(available, 720));
    };

    recalc();
    window.addEventListener('resize', recalc);
    return () => window.removeEventListener('resize', recalc);
  }, []);

  return (
    <section ref={layoutRef} className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-white">Agenda</h1>
        <p className="text-sm text-white/60">
          Visualiza tu calendario, revisa tus citas y gestiona cambios desde un solo lugar.
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <Card
          ref={calendarCardRef}
          className="text-card-foreground flex flex-col gap-8 rounded-3xl border border-white/10 bg-white/8 p-6 shadow-lg shadow-emerald-900/25 backdrop-blur"
        >
          <CardHeader className="space-y-1.5 flex flex-col gap-4 p-0">
            <div className="space-y-1">
              <CardTitle className="text-lg font-semibold text-white">Calendario general</CardTitle>
              <CardDescription className="text-sm text-white/70">
                Los días con citas destacan con un indicador sutil.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                <span className="relative inline-flex h-2.5 w-2.5 items-center justify-center rounded-full bg-emerald-400/80 shadow-[0_0_6px_rgba(16,185,129,0.5)]" aria-hidden="true" />
                <span>Día con citas</span>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                <span className="inline-flex h-2.5 w-2.5 items-center justify-center rounded-full border border-emerald-400/70" aria-hidden="true" />
                <span>Hoy</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Calendar
              mode="single"
              selected={selectedDate}
              month={currentMonth}
              onSelect={handleSelectDay}
              onMonthChange={handleMonthChange}
              modifiers={{ busy: busyDates }}
              modifiersClassNames={{ busy: 'pelu-day-has-appointments' }}
              className="w-full rounded-[2.75rem] border border-white/10 bg-white/8 p-7 text-white shadow-[inset_0_0_1.5rem_rgba(15,118,110,0.18)] backdrop-blur-sm"
              classNames={{
                months: 'flex flex-col gap-8',
                month: 'space-y-6 rounded-3xl bg-white/8 p-5 shadow-[0_0.5rem_1.5rem_rgba(8,47,40,0.28)] backdrop-blur-sm',
                table: 'w-full border-separate border-spacing-y-2 border-spacing-x-2',
                caption: 'flex w-full items-center justify-between gap-6 rounded-2xl border border-white/10 bg-white/8 px-5 py-3 text-white',
                nav: 'flex items-center gap-3',
                nav_button:
                  'inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:border-emerald-400/60 hover:bg-emerald-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400/70',
                nav_button_previous: '',
                nav_button_next: '',
                caption_label: 'text-lg font-semibold capitalize tracking-[0.02em] text-white',
                head_cell: 'text-[0.75rem] uppercase tracking-[0.32em] text-white/60',
                row: 'gap-3',
                cell: 'p-1 text-center align-middle',
                day: 'text-center align-middle',
                day_button:
                  'relative inline-flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-2xl text-base font-semibold text-white/80 transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400/70',
                day_selected:
                  'bg-emerald-500/90 text-white shadow-[0_0_18px_rgba(16,185,129,0.45)] hover:bg-emerald-500/90 focus:bg-emerald-500/90',
                day_today:
                  'border border-emerald-400/70 text-emerald-200 rounded-2xl font-semibold',
                day_outside:
                  'text-white/35 aria-selected:bg-white/10 aria-selected:text-white/60',
              }}
              fromMonth={fromMonth}
              toMonth={toMonth}
            />
          </CardContent>
        </Card>

        <Card
          ref={agendaCardRef}
          className="text-card-foreground flex flex-col rounded-3xl border border-white/10 bg-white/8 p-6 shadow-lg shadow-emerald-900/25 backdrop-blur"
          style={agendaCardHeight ? { height: agendaCardHeight } : undefined}
        >
          <CardHeader className="space-y-1.5 flex flex-col gap-4 p-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg font-semibold text-white">{dayLabel}</CardTitle>
                <CardDescription className="text-sm text-white/70">
                  {summary.total > 0
                    ? `${summary.total} citas programadas para este día.`
                    : 'No hay citas asignadas todavía.'}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                className="rounded-full border-emerald-400/60 px-4 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/10"
                onClick={handleCreate}
              >
                Crear nueva cita
              </Button>
            </div>
            {summary.total > 0 && (
              <div className="flex flex-wrap gap-2 text-xs text-white/70">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1">
                  <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400/80" />
                  Confirmadas {summary.confirmadas}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1">
                  <span className="inline-flex h-2 w-2 rounded-full bg-amber-400/80" />
                  Pendientes {summary.pendientes}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1">
                  <span className="inline-flex h-2 w-2 rounded-full bg-rose-400/80" />
                  Canceladas {summary.canceladas}
                </span>
              </div>
            )}
          </CardHeader>
          <CardContent className="mt-5 flex-1 overflow-hidden p-0">
            {summary.total > 0 ? (
              <ScrollArea className="relative h-full min-h-0 pr-2">
                <div className="space-y-4 pb-2">
                  {selectedAppointments.map((appointment) => (
                    <article
                      key={appointment.id}
                      className="flex flex-col gap-3 rounded-2xl ring-1 ring-white/10 bg-white/5 p-4 text-sm text-white/80 transition hover:ring-white/30 hover:bg-white/10"
                    >
                      <header className="flex flex-wrap items-center justify-between gap-3 text-white">
                        <div className="flex items-center gap-3">
                          <span className="text-base font-semibold tabular-nums">{appointment.time} h</span>
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide ${STATUS_STYLES[appointment.status]}`}
                          >
                            {appointment.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full border-emerald-400/60 px-3 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/10"
                            onClick={() => handleAppointmentAction('reschedule', appointment)}
                          >
                            Reprogramar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-full px-3 text-xs font-semibold text-rose-200 hover:bg-rose-500/10"
                            onClick={() => handleAppointmentAction('cancel', appointment)}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </header>
                      <div className="space-y-1 text-white/75">
                        <p className="text-sm font-semibold text-white">{appointment.client}</p>
                        <p className="text-sm">{appointment.service}</p>
                        {appointment.notes && <p className="text-xs text-white/60">{appointment.notes}</p>}
                      </div>
                    </article>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/5 text-center text-sm text-white/70">
                <p>Este día está libre. Crea una nueva cita o marca un hueco disponible.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default ProsAgenda;
