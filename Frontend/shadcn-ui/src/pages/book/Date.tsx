import { useLocation, useNavigate } from 'react-router-dom';
import { useBooking } from '@/store/booking';
import { useEffect, useMemo, useState, useCallback } from 'react';
import type { KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { api, type Service } from '@/lib/api';
import { addDays, addMonths, endOfMonth, endOfWeek, format, isAfter, isBefore, isSameDay, isSameMonth, isToday, startOfMonth, startOfWeek, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarNav } from '@/components/ui/CalendarNav';
import '@/styles/calendar.css';
import { BookingLayout } from '@/components/BookingLayout';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { buildBookingState, getBackgroundLocation } from '@/lib/booking-route';
import { Check } from '@/lib/icons';

type PeriodValue = 'manana' | 'tarde' | 'noche';

const PERIOD_DEFINITIONS: Array<{ value: PeriodValue; label: string; fromHour: number; toHour: number }> = [
  { value: 'manana', label: 'Mañana', fromHour: 6, toHour: 14 },
  { value: 'tarde', label: 'Tarde', fromHour: 14, toHour: 19 },
  { value: 'noche', label: 'Noche', fromHour: 19, toHour: 24 },
];

const toYmd = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const ANY_PRO = '__any__';

type RangeValue = 'morning' | 'afternoon';

const BookDate = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const backgroundLocation = getBackgroundLocation(location);

  const {
    serviceId,
    serviceName,
    professionalId,
    professionalName,
    slotStart,
    setProfessional,
    setDate,
    setSlot,
    setService,
  } = useBooking((s) => ({
    serviceId: s.serviceId,
    serviceName: s.serviceName,
    professionalId: s.professionalId,
    professionalName: s.professionalName,
    slotStart: s.slotStart,
    setProfessional: s.setProfessional,
    setDate: s.setDate,
    setSlot: s.setSlot,
    setService: s.setService,
  }));

  const [selected, setSelected] = useState<Date | undefined>(undefined);
  const [month, setMonth] = useState<Date>(() => new Date());
  const [focusedDate, setFocusedDate] = useState<Date>(() => new Date());
  // Usa variable de entorno para activar Google Calendar por defecto (1/true = activo)
  const [useGcal] = useState<boolean>(() => {
    const v = (import.meta as unknown as { env: { VITE_USE_GCAL?: string | boolean } }).env?.VITE_USE_GCAL;
    return v === '1' || v === 'true' || v === true;
  });

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const serviceIdParam = searchParams.get('service') || undefined;
  const serviceNameParam = searchParams.get('service_name') || undefined;

  const { data: servicesData = [] } = useQuery<Service[], Error>({
    queryKey: ['services'],
    queryFn: api.getServices,
    staleTime: 5 * 60 * 1000,
  });

  // Lee/rehidrata servicio desde URL si falta en el store.
  useEffect(() => {
    if (!serviceIdParam) return;
    if (!serviceId || serviceId !== serviceIdParam || (serviceNameParam && serviceName !== serviceNameParam)) {
      setService(serviceIdParam, serviceNameParam ?? serviceName);
    }
    const proParam = searchParams.get('pro');
    const proNameParam = searchParams.get('pro_name');
    if (proParam && (!professionalId || professionalId !== proParam || (proNameParam && professionalName !== proNameParam))) {
      setProfessional(proParam, proNameParam ?? professionalName ?? null);
    }
    if (!proParam && professionalId && !slotStart) {
      setProfessional(professionalId, professionalName ?? null);
    }
  }, [serviceIdParam, serviceNameParam, serviceId, serviceName, searchParams, professionalId, professionalName, slotStart, setService, setProfessional]);

  // Si solo tenemos el ID del servicio, recupera su nombre para el resumen.
  useEffect(() => {
    if (!serviceId || serviceName) return;
    const found = servicesData.find((s) => s.id === serviceId);
    if (found) setService(serviceId, found.name);
  }, [serviceId, serviceName, servicesData, setService]);

  // Rehidratar fecha seleccionada desde el slot si venimos de Confirm
  useEffect(() => {
    if (slotStart && !selected) {
      const d = new Date(slotStart);
      d.setHours(0, 0, 0, 0);
      setSelected(d);
      setDate(toYmd(d));
      setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
      setFocusedDate(d);
    }
  }, [slotStart, selected, setDate]);

  useEffect(() => {
    if (serviceId || serviceIdParam) return;
    if (servicesData.length > 0) {
      const fallback = servicesData[0];
      setService(fallback.id, fallback.name);
    } else {
      setService('corte_cabello', serviceName ?? undefined);
    }
  }, [serviceId, serviceIdParam, servicesData, setService, serviceName]);

  const resolvedServiceLabel = useMemo(() => {
    return (
      serviceName ??
      serviceNameParam ??
      servicesData.find((s) => s.id === serviceId)?.name ??
      serviceId ??
      ''
    );
  }, [serviceId, serviceName, serviceNameParam, servicesData]);

  const {
    data: pros = [],
    isFetched: prosFetched,
  } = useQuery<{ id: string; name: string; services?: string[] }[], Error>({
    queryKey: ['professionals', serviceId],
    queryFn: api.getProfessionals,
    enabled: !!serviceId,
    staleTime: 60 * 1000,
    retry: 1,
    select: (all) => all.filter((p) => !serviceId || !p.services || p.services.includes(serviceId)),
  });

  useEffect(() => {
    if (!prosFetched) return;
    if (pros.length === 1) {
      const [onlyPro] = pros;
      if (onlyPro && professionalId !== onlyPro.id) {
        setProfessional(onlyPro.id, onlyPro.name ?? null);
      }
    }
  }, [prosFetched, pros, professionalId, setProfessional]);

  const showProfessionalSelect = prosFetched && pros.length > 1;
  const singleProfessional = prosFetched && pros.length === 1 ? pros[0] : null;

  const monthKey = `${month.getFullYear()}-${month.getMonth()}`;
  const {
    data: daysData,
    isFetching: daysFetching,
    isError: daysIsError,
    error: daysErrorObj,
    refetch: refetchDays,
  } = useQuery({
    queryKey: ['days-availability', serviceId, monthKey, professionalId ?? 'any', useGcal],
    enabled: !!serviceId,
    staleTime: 30 * 1000,
    retry: 1,
    queryFn: () => {
      const start = startOfMonth(month);
      const end = endOfMonth(month);
      return api.getDaysAvailability({
        service_id: serviceId!,
        start: toYmd(start),
        end: toYmd(end),
        professional_id: professionalId ?? undefined,
        use_gcal: useGcal,
      });
    },
  });

  const availableDays = useMemo(() => new Set(daysData?.available_days ?? []), [daysData]);

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  // Límite: hoy + 6 meses.
  const maxDate = useMemo(() => {
    const d = new Date(today);
    d.setMonth(d.getMonth() + 6);
    return d;
  }, [today]);

  const selectedValid = useMemo(() => {
    if (!selected) return false;
    const nd = new Date(selected);
    nd.setHours(0, 0, 0, 0);
    if (nd < today || nd > maxDate) return false;
    return availableDays.has(toYmd(nd));
  }, [selected, today, maxDate, availableDays]);

  const selectedYmd = selected ? toYmd(selected) : undefined;

  useEffect(() => {
    if (selected && !availableDays.has(toYmd(selected))) {
      setSelected(undefined);
      setDate('');
    }
  }, [availableDays, selected, setDate]);

  useEffect(() => {
    if (selectedYmd && selectedValid) {
      setDate(selectedYmd);
    }
  }, [selectedYmd, selectedValid, setDate]);

  const {
    data: slotsData,
    isFetching: slotsFetching,
    isError: slotsIsError,
    error: slotsErrorObj,
    refetch: refetchSlots,
  } = useQuery({
    queryKey: ['slots', serviceId, selectedYmd, professionalId ?? 'any', useGcal],
    enabled: !!serviceId && !!selectedYmd && selectedValid,
    staleTime: 10 * 1000,
    retry: 1,
    queryFn: () =>
      api.getSlots({
        service_id: serviceId!,
        date: selectedYmd!,
        professional_id: professionalId ?? undefined,
        use_gcal: useGcal,
      }),
  });

  const slots = useMemo(() => slotsData?.slots ?? [], [slotsData]);
  const slotsLoading = slotsFetching && !slotsData;
  const slotsError = slotsIsError ? slotsErrorObj?.message ?? 'Error cargando horarios' : null;
  const daysError = daysIsError ? daysErrorObj?.message ?? 'Error comprobando disponibilidad de días' : null;
  const daysLoading = daysFetching && !daysData;

  const slotsByPeriod = useMemo<Record<PeriodValue, string[]>>(() => {
    const initial = PERIOD_DEFINITIONS.reduce((acc, { value }) => {
      acc[value] = [];
      return acc;
    }, {} as Record<PeriodValue, string[]>);

    return slots.reduce((acc, iso) => {
      const slotDate = new Date(iso);
      if (Number.isNaN(slotDate.getTime())) {
        acc.noche.push(iso);
        return acc;
      }

      const hour = slotDate.getHours();
      const match = PERIOD_DEFINITIONS.find(({ fromHour, toHour }) => hour >= fromHour && hour < toHour);
      const key = match?.value ?? 'noche';
      acc[key].push(iso);
      return acc;
    }, initial);
  }, [slots]);

  const morningSlots = useMemo(() => [...slotsByPeriod.manana], [slotsByPeriod.manana]);
  const afternoonSlots = useMemo(() => [...slotsByPeriod.tarde, ...slotsByPeriod.noche], [slotsByPeriod.tarde, slotsByPeriod.noche]);
  const [range, setRange] = useState<RangeValue>(() => (morningSlots.length > 0 ? 'morning' : 'afternoon'));

  useEffect(() => {
    if (slotStart) {
      if (morningSlots.includes(slotStart) && range !== 'morning') {
        setRange('morning');
        return;
      }
      if (afternoonSlots.includes(slotStart) && range !== 'afternoon') {
        setRange('afternoon');
        return;
      }
    }

    if (range === 'morning' && morningSlots.length === 0 && afternoonSlots.length > 0) {
      setRange('afternoon');
    }

    if (range === 'afternoon' && afternoonSlots.length === 0 && morningSlots.length > 0) {
      setRange('morning');
    }
  }, [slotStart, morningSlots, afternoonSlots, range]);

  const displayedSlots = range === 'morning' ? morningSlots : afternoonSlots;

  const canContinue = !!slotStart; // requiere elegir un hueco
  const noProfessionals = prosFetched && pros.length === 0;

  const onNext = () => {
    if (!selectedValid || slots.length === 0 || !slotStart) return;
    const params = new URLSearchParams();
    if (serviceId) params.set('service', serviceId);
    if (resolvedServiceLabel) params.set('service_name', resolvedServiceLabel);
    params.set('start', slotStart);
    let resolvedProfessionalName = professionalName ?? undefined;
    if (professionalId) {
      params.set('pro', professionalId);
      const pro = pros.find((p) => p.id === professionalId);
      if (pro?.name) {
        params.set('pro_name', pro.name);
        resolvedProfessionalName = pro.name;
      }
    }
    navigate(`/book/confirm?${params.toString()}`, {
      state: buildBookingState(location, {
        serviceId,
        serviceName: resolvedServiceLabel,
        professionalId,
        professionalName: resolvedProfessionalName ?? null,
        slotStart,
      }),
    });
  };

  const goBackToBackground = () => {
    if (backgroundLocation) {
      const target = `${backgroundLocation.pathname}${backgroundLocation.search}${backgroundLocation.hash}` || '/';
      navigate(target, { replace: true });
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/', { replace: true });
    }
  };

  const onGridKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    const key = e.key;
    let next = focusedDate || today;

    if (key === 'ArrowLeft') { next = addDays(next, -1); e.preventDefault(); }
    else if (key === 'ArrowRight') { next = addDays(next, 1); e.preventDefault(); }
    else if (key === 'ArrowUp') { next = addDays(next, -7); e.preventDefault(); }
    else if (key === 'ArrowDown') { next = addDays(next, 7); e.preventDefault(); }
    else if (key === 'PageUp') { next = addMonths(next, -1); e.preventDefault(); }
    else if (key === 'PageDown') { next = addMonths(next, 1); e.preventDefault(); }
    else if (key === 'Enter' || key === ' ') {
      const ymd = toYmd(focusedDate);
      const enabled = isSameMonth(focusedDate, month) && !isBefore(focusedDate, today) && !isAfter(focusedDate, maxDate) && availableDays.has(ymd);
      if (enabled) {
        setSelected(focusedDate);
        setDate(toYmd(focusedDate));
      }
      return;
    } else {
      return;
    }

    if (next.getMonth() !== month.getMonth() || next.getFullYear() !== month.getFullYear()) {
      setMonth(new Date(next.getFullYear(), next.getMonth(), 1));
    }
    setFocusedDate(next);
  }, [focusedDate, month, today, maxDate, availableDays, setDate]);

  const onPrevMonth = () => setMonth(subMonths(month, 1));
  const onNextMonth = () => setMonth(addMonths(month, 1));

  useEffect(() => {
    const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    if (focusedDate < gridStart || focusedDate > gridEnd) {
      setFocusedDate(month);
    }
  }, [month, focusedDate]);

  const monthStart = useMemo(() => startOfMonth(month), [month]);
  const monthEnd = useMemo(() => endOfMonth(month), [month]);
  const gridStart = useMemo(() => startOfWeek(monthStart, { weekStartsOn: 1 }), [monthStart]);
  const gridEnd = useMemo(() => endOfWeek(monthEnd, { weekStartsOn: 1 }), [monthEnd]);

  const days = useMemo(() => {
    const list: Date[] = [];
    let d = gridStart;
    while (d <= gridEnd) {
      list.push(d);
      d = addDays(d, 1);
    }
    return list;
  }, [gridStart, gridEnd]);

  const onRetryDays = () => refetchDays();
  const onRetrySlots = () => refetchSlots();

  const handleRangeChange = (next: RangeValue) => {
    if (range === next) return;
    setRange(next);
    if (slotStart) {
      setSlot('');
    }
  };

  const onSelectSlot = (iso: string) => {
    if (slotStart === iso) {
      setSlot('');
      return;
    }

    setSlot(iso);
  };

  return (
    <BookingLayout title="Selecciona fecha y hora" summary={resolvedServiceLabel || undefined}>
      <div className="mx-auto w-full max-w-[1160px] px-4 sm:px-6">
        <div className="relative rounded-3xl border border-zinc-800/70 bg-zinc-900/85 shadow-[0_24px_90px_-55px_rgba(0,0,0,0.78)]">
          <div className="p-5 md:p-7 lg:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-white md:text-xl">Selecciona fecha y hora</h3>
                <p className="mt-1 text-xs text-zinc-400 md:text-sm">Elige un día y después un horario disponible.</p>
              </div>
              <div className="flex w-full justify-center md:w-auto md:justify-end md:pt-1">
                {!prosFetched ? (
                  <div className="flex flex-col items-center gap-1 md:items-end">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-600">Profesional</span>
                    <Skeleton className="h-8 w-32 rounded-lg bg-zinc-800/70" />
                  </div>
                ) : showProfessionalSelect ? (
                  <div className="flex flex-col items-center gap-1 md:items-end">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-600">Profesional</span>
                    <Select
                      value={professionalId ?? ANY_PRO}
                      onValueChange={(v) => {
                        const nextId = v === ANY_PRO ? null : v;
                        const nextName = nextId ? pros.find((p) => p.id === nextId)?.name ?? null : null;
                        setProfessional(nextId, nextName);
                        setDate('');
                      }}
                    >
                      <SelectTrigger
                        aria-label="Seleccionar profesional"
                        className="h-8 w-36 rounded-lg border border-zinc-700/60 bg-zinc-900/70 px-3 text-xs font-medium text-zinc-300 transition-colors focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
                      >
                        <SelectValue placeholder="Cualquiera" />
                      </SelectTrigger>
                      <SelectContent align="end" sideOffset={6} className="min-w-[150px]">
                        <SelectItem value={ANY_PRO}>Cualquiera</SelectItem>
                        {pros.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : singleProfessional ? (
                  <div className="flex flex-col items-center gap-1 text-xs text-zinc-400 md:items-end">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-600">Profesional</span>
                    <span className="text-sm text-zinc-400">{singleProfessional.name ?? professionalName ?? 'Cualquiera'}</span>
                  </div>
                ) : null}
              </div>
            </div>

            {noProfessionals && (
              <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200" aria-live="polite">
                Por ahora ningún profesional ofrece este servicio. Puedes elegir otro servicio o volver más tarde.
              </div>
            )}

            <div className="mt-8 flex flex-col items-center gap-8 lg:flex-row lg:items-start lg:justify-center lg:gap-12">
              <section className="w-full max-w-[540px] rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 md:p-6 lg:p-7">
                <CalendarNav month={month} onPrev={onPrevMonth} onNext={onNextMonth} />

                <div className="mt-4 grid grid-cols-7 gap-1.5 text-center text-[11px] uppercase tracking-wide text-white/50 md:gap-2">
                  {['lu','ma','mi','ju','vi','sá','do'].map((w) => (
                    <div key={w} className="grid h-7 place-items-center rounded-lg bg-zinc-900/70 text-xs font-semibold text-white/60 md:h-8">
                      {w}
                    </div>
                  ))}
                </div>

                <div
                  key={`${month.getFullYear()}-${month.getMonth()}`}
                  role="grid"
                  aria-label={format(month, 'LLLL yyyy', { locale: es })}
                  className="mt-4 grid grid-cols-7 gap-2 md:gap-2.5 lg:gap-3"
                  tabIndex={0}
                  onKeyDown={onGridKeyDown}
                >
                  {days.map((d) => {
                    const ymd = toYmd(d);
                    const inMonth = isSameMonth(d, month);
                    const outOfRange = isBefore(d, today) || isAfter(d, maxDate);
                    const enabled = inMonth && !outOfRange && availableDays.has(ymd);
                    const selectedDay = selected ? isSameDay(d, selected) : false;
                    const isFocused = isSameDay(d, focusedDate);
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                    const dayClasses = cn(
                      'group relative grid h-11 w-11 place-items-center rounded-2xl text-sm font-semibold leading-none transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 md:h-12 md:w-12 md:text-base lg:h-[3.25rem] lg:w-[3.25rem]',
                      '[font-variant-numeric:tabular-nums] shadow-none',
                      isWeekend ? 'text-white/75' : 'text-white/85',
                      !inMonth && 'cursor-not-allowed text-white/20 opacity-80 hover:bg-transparent',
                      inMonth && !enabled && 'cursor-not-allowed text-white/35 opacity-70 hover:bg-transparent',
                      enabled && inMonth && !selectedDay && 'border border-transparent hover:border-white/15 hover:bg-white/5',
                      selectedDay && 'border border-emerald-500/50 bg-emerald-500/10 text-emerald-200 shadow-[0_0_0_2px_rgba(16,185,129,0.3)]',
                      isToday(d) && !selectedDay && 'border border-white/15 text-white'
                    );

                    return (
                      <div key={ymd} className="flex items-center justify-center">
                        <button
                          type="button"
                          role="gridcell"
                          aria-selected={selectedDay}
                          aria-disabled={!enabled}
                          aria-current={isToday(d) ? 'date' : undefined}
                          data-today={isToday(d)}
                          data-selected={selectedDay}
                          data-enabled={enabled}
                          data-disabled={!enabled}
                          disabled={!enabled}
                          tabIndex={isFocused ? 0 : -1}
                          onClick={() => {
                            if (!enabled) return;
                            setSelected(d);
                            setDate(ymd);
                          }}
                          className={dayClasses}
                        >
                          <span>{String(d.getDate())}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>

                <p className="mt-5 text-left text-xs text-zinc-400 md:text-sm">Selecciona un día para ver horarios disponibles.</p>
              </section>

              <aside className="w-full max-w-[380px] space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 md:p-6">
                <div className="flex flex-col items-center gap-5 text-center">
                  <h4 className="text-base font-semibold text-white md:text-lg">Selecciona un horario</h4>
                  <div className="grid w-full grid-cols-2 gap-2 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-2">
                    <button
                      type="button"
                      aria-pressed={range === 'morning'}
                      disabled={!selectedValid || morningSlots.length === 0}
                      onClick={() => handleRangeChange('morning')}
                      className={cn(
                        'inline-flex h-12 items-center justify-center rounded-xl border border-transparent px-4 text-sm font-semibold uppercase tracking-wide text-zinc-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900',
                        'hover:bg-zinc-800/60',
                        range === 'morning' && 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200 shadow-[0_0_0_1px_rgba(16,185,129,0.35)]',
                        (!selectedValid || morningSlots.length === 0) && 'cursor-not-allowed opacity-40'
                      )}
                    >
                      Mañana
                    </button>
                    <button
                      type="button"
                      aria-pressed={range === 'afternoon'}
                      disabled={!selectedValid || afternoonSlots.length === 0}
                      onClick={() => handleRangeChange('afternoon')}
                      className={cn(
                        'inline-flex h-12 items-center justify-center rounded-xl border border-transparent px-4 text-sm font-semibold uppercase tracking-wide text-zinc-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900',
                        'hover:bg-zinc-800/60',
                        range === 'afternoon' && 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200 shadow-[0_0_0_1px_rgba(16,185,129,0.35)]',
                        (!selectedValid || afternoonSlots.length === 0) && 'cursor-not-allowed opacity-40'
                      )}
                    >
                      Tarde
                    </button>
                  </div>
                </div>

                {slotsLoading && (
                  <div className="mx-auto grid w-full max-w-[520px] grid-cols-[repeat(auto-fit,minmax(132px,1fr))] justify-center justify-items-center gap-3 md:gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full rounded-xl" />
                    ))}
                  </div>
                )}

                {!slotsLoading && (
                  <>
                    {selectedValid ? (
                      displayedSlots.length > 0 ? (
                        <div
                          data-testid="slots-grid"
                          className="mx-auto grid w-full max-w-[520px] grid-cols-[repeat(auto-fit,minmax(132px,1fr))] justify-center justify-items-center gap-3 md:gap-4"
                        >
                          {displayedSlots.map((iso, index) => {
                            const selectedSlot = slotStart === iso;
                            const slotDate = new Date(iso);
                            const label = Number.isNaN(slotDate.getTime())
                              ? iso.slice(11, 16)
                              : format(slotDate, 'HH:mm', { locale: es });
                            const animationDelay = `${Math.min(index, 6) * 40}ms`;
                            return (
                              <button
                                key={iso}
                                type="button"
                                aria-pressed={selectedSlot}
                                data-selected={selectedSlot}
                                className={cn(
                                  'group relative grid h-12 w-full min-w-[132px] place-items-center rounded-xl border border-zinc-700/70 bg-transparent px-5 text-base font-semibold leading-none text-zinc-100 transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900',
                                  'hover:bg-zinc-800/50',
                                  'transform-gpu animate-in fade-in-50 slide-in-from-bottom-1',
                                  selectedSlot && 'scale-[1.03] border-emerald-500/50 bg-emerald-500/15 text-emerald-200 shadow-[0_0_0_2px_rgba(16,185,129,0.3)]',
                                  !selectedSlot && 'scale-[1] opacity-95',
                                  'disabled:cursor-not-allowed disabled:border-zinc-800/70 disabled:text-zinc-500 disabled:hover:bg-transparent disabled:opacity-40'
                                )}
                                style={{ animationDelay }}
                                onClick={() => onSelectSlot(iso)}
                              >
                                <span className="w-full text-center [font-variant-numeric:tabular-nums] tracking-tight">{label}</span>
                                <Check
                                  aria-hidden="true"
                                  className={cn(
                                    'pointer-events-none absolute right-2 h-3.5 w-3.5 text-emerald-300 opacity-0 transition-all duration-200 ease-out',
                                    selectedSlot ? 'translate-y-0 opacity-100' : '-translate-y-1'
                                  )}
                                />
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-400">No hay horarios disponibles en este tramo.</p>
                      )
                    ) : (
                      <p className="text-xs text-zinc-400">Selecciona un día en el calendario para ver horarios disponibles.</p>
                    )}
                  </>
                )}

                {slotsError && !slotsLoading && (
                  <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-center">
                    <div className="text-sm text-neutral-100">{slotsError}</div>
                    <Button size="sm" onClick={onRetrySlots}>Reintentar</Button>
                  </div>
                )}
              </aside>
              <Button
                disabled={!canContinue}
                data-ready={canContinue}
                onClick={onNext}
                aria-disabled={!canContinue}
                className={cn(
                  'h-10 rounded-xl border border-zinc-700 bg-transparent px-5 text-zinc-100 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-200 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 disabled:pointer-events-none disabled:opacity-60',
                  canContinue
                    ? 'border-emerald-500/50 text-emerald-200 shadow-[0_0_0_1px_rgba(16,185,129,0.35)] hover:border-emerald-500/60 hover:bg-emerald-500/15 focus-visible:ring-emerald-400 data-[ready=true]:animate-[pulse_1.2s_ease-out_1]'
                    : 'hover:border-zinc-600 hover:bg-zinc-800/50'
                )}
              >
                {canContinue ? 'Continuar' : 'Selecciona un horario'}
              </Button>
            </div>
          </div>

          {daysLoading && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40">
              <div className="rounded-lg bg-neutral-800 px-3 py-2 text-sm text-neutral-200" role="status" aria-live="polite">
                Comprobando disponibilidad…
              </div>
            </div>
          )}
          {daysError && !daysLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-black/70">
              <div className="text-sm text-neutral-200" role="status" aria-live="assertive">{daysError}</div>
              <Button size="sm" onClick={onRetryDays}>Reintentar</Button>
            </div>
          )}
        </div>
      </div>
    </BookingLayout>
  );
};

export default BookDate;
