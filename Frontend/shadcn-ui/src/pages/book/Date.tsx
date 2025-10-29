import { useLocation, useNavigate } from 'react-router-dom';
import { useBooking } from '@/store/booking';
import { useEffect, useMemo, useState, useCallback } from 'react';
import type { KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { api, type Service } from '@/lib/api';
import { addDays, addMonths, endOfMonth, endOfWeek, format, isAfter, isBefore, isSameDay, isSameMonth, isToday, startOfMonth, startOfWeek, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarNav } from '@/components/ui/CalendarNav';
import '@/styles/calendar.css';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { buildBookingState } from '@/lib/booking-route';
import { loadBookService } from '@/lib/route-imports';
import { BookingLayout } from '@/components/BookingLayout';
import { Check, Loader2, Scissors, Sparkles, Crown, Brush, type LucideIcon } from '@/lib/icons';

type PeriodValue = 'manana' | 'tarde' | 'noche';

type RangeValue = 'morning' | 'afternoon';

const PERIOD_DEFINITIONS: Array<{ value: PeriodValue; label: string; fromHour: number; toHour: number }> = [
  { value: 'manana', label: 'Mañana', fromHour: 6, toHour: 14 },
  { value: 'tarde', label: 'Tarde', fromHour: 14, toHour: 19 },
  { value: 'noche', label: 'Noche', fromHour: 19, toHour: 24 },
];

const SERVICE_ICON_MAP: Record<string, LucideIcon> = {
  corte_cabello: Scissors,
  corte_barba: Sparkles,
  arreglo_barba: Brush,
  corte_jubilado: Crown,
};

const toYmd = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const BookDate = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const serviceIdParam = searchParams.get('service') || undefined;
  const serviceNameParam = searchParams.get('service_name') || undefined;

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
  const useGcal = false;

  const { data: servicesData = [] } = useQuery<Service[], Error>({
    queryKey: ['services'],
    queryFn: api.getServices,
    staleTime: 5 * 60 * 1000,
  });

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

  useEffect(() => {
    if (!serviceId || serviceName) return;
    const found = servicesData.find((s) => s.id === serviceId);
    if (found) setService(serviceId, found.name);
  }, [serviceId, serviceName, servicesData, setService]);

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

  const resolvedServiceId = serviceId ?? serviceIdParam ?? undefined;

  const selectedServiceInfo = useMemo(() => {
    if (!resolvedServiceId) return undefined;
    return servicesData.find((s) => s.id === resolvedServiceId);
  }, [servicesData, resolvedServiceId]);

  const ServiceIcon = resolvedServiceId ? SERVICE_ICON_MAP[resolvedServiceId] : undefined;

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

  const monthKey = `${month.getFullYear()}-${month.getMonth()}`;
  const daysQueryUseGcal = false;

  const {
    data: daysData,
    isFetching: daysFetching,
    isError: daysIsError,
    error: daysErrorObj,
    refetch: refetchDays,
  } = useQuery({
    queryKey: ['days-availability', serviceId, monthKey, professionalId ?? 'any', daysQueryUseGcal],
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
        use_gcal: daysQueryUseGcal,
      });
    },
  });

  const availableDays = useMemo(() => new Set(daysData?.available_days ?? []), [daysData]);

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

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

  const canContinue = !!slotStart;
  const noProfessionals = prosFetched && pros.length === 0;

  const onChangeService = useCallback(() => {
    loadBookService();
    navigate('/book/service', { state: buildBookingState(location) });
  }, [location, navigate]);

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
    <BookingLayout className="rounded-[28px] bg-background px-5 py-5 shadow-[0_50px_120px_-65px_rgba(0,0,0,0.85)] md:px-7 md:py-6">
      <div className="relative mx-auto flex w-full flex-col gap-8">
        {resolvedServiceLabel && (
          <div className="mx-auto w-full max-w-3xl rounded-2xl border border-white/12 bg-background px-5 py-5 text-white shadow-[0_40px_85px_-50px_rgba(0,0,0,0.85)]">
            <div className="flex flex-col items-center gap-5 md:flex-row md:items-center md:justify-between">
              <div className="flex w-full flex-1 items-center gap-4 text-left">
                {ServiceIcon ? (
                  <span className="grid h-14 w-14 flex-none place-items-center rounded-xl bg-white/10 text-white">
                    <ServiceIcon className="h-7 w-7" aria-hidden="true" />
                  </span>
                ) : null}
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/50">
                    Servicio seleccionado
                  </p>
                  <h4 className="text-xl font-semibold text-white md:text-2xl">{resolvedServiceLabel}</h4>
                </div>
              </div>
              <div className="flex w-full flex-col items-stretch justify-center gap-4 border-t border-white/10 pt-4 md:w-auto md:flex-row md:items-center md:gap-8 md:border-t-0 md:pt-0">
                {selectedServiceInfo ? (
                  <>
                    <div className="text-center md:text-left">
                      <p className="text-[11px] uppercase tracking-[0.28em] text-white/60">Duración</p>
                      <p className="text-lg font-semibold text-white">
                        {selectedServiceInfo.duration_min} min
                      </p>
                    </div>
                    <div className="text-center md:text-left">
                      <p className="text-[11px] uppercase tracking-[0.28em] text-white/60">Precio</p>
                      <p className="text-lg font-semibold text-white">
                        {selectedServiceInfo.price_eur} €
                      </p>
                    </div>
                  </>
                ) : null}
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg border-white/25 bg-transparent px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-white/40 hover:bg-white/10"
                  onClick={onChangeService}
                >
                  Cambiar servicio
                </Button>
              </div>
            </div>
          </div>
        )}

        {noProfessionals && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200" aria-live="polite">
            Por ahora ningún profesional ofrece este servicio. Puedes elegir otro servicio o volver más tarde.
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,360px)] lg:items-start lg:gap-10">
          <section className="w-full rounded-2xl border border-white/12 bg-background p-5 md:p-6 lg:p-7">
            <CalendarNav month={month} onPrev={onPrevMonth} onNext={onNextMonth} />

            <div className="mt-4 grid grid-cols-7 gap-1.5 text-center text-[11px] uppercase tracking-wide text-white/50 md:gap-2">
              {['lu', 'ma', 'mi', 'ju', 'vi', 'sá', 'do'].map((w) => (
                <div key={w} className="grid h-7 place-items-center rounded-lg bg-white/5 text-xs font-semibold text-white/60 md:h-8">
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
                    'group relative grid h-11 w-11 place-items-center rounded-2xl text-sm font-semibold leading-none transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 md:h-12 md:w-12 md:text-base lg:h-[3.25rem] lg:w-[3.25rem]',
                    '[font-variant-numeric:tabular-nums] shadow-none',
                    isWeekend ? 'text-white/75' : 'text-white/85',
                    !inMonth && 'cursor-not-allowed text-white/20 opacity-80 hover:bg-transparent',
                    inMonth && !enabled && 'cursor-not-allowed text-white/35 opacity-70 hover:bg-transparent',
                    enabled && inMonth && !selectedDay && 'border border-transparent hover:border-white/15 hover:bg-white/5',
                    selectedDay && 'border border-white/70 bg-white/10 text-white shadow-[0_0_0_2px_rgba(255,255,255,0.25)]',
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

            <p className="mt-5 text-center text-xs text-zinc-400 md:text-sm">Solo los días en blanco están disponibles.</p>
          </section>

          <aside className="w-full space-y-4 rounded-2xl border border-white/12 bg-background p-5 md:p-6">
            <div className="flex flex-col items-start gap-2">
              <h4 className="text-base font-semibold text-white md:text-lg">Horarios disponibles</h4>
              <p className="text-xs text-zinc-400 md:text-sm">Elige el tramo horario que prefieras para ver los huecos libres.</p>
            </div>

            <div className="inline-flex w-full max-w-[340px] items-center justify-between gap-1 rounded-full border border-white/15 bg-background p-1 text-xs text-zinc-300 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] md:text-sm">
              {([
                { value: 'morning', label: 'Mañana' },
                { value: 'afternoon', label: 'Tarde / Noche' },
              ] satisfies Array<{ value: RangeValue; label: string }>).map(({ value, label }) => {
                const active = range === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleRangeChange(value)}
                    className={cn(
                      'flex-1 rounded-full px-4 py-1.5 font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900',
                      active
                        ? 'bg-white/15 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.3)]'
                        : 'text-zinc-400 hover:bg-white/5'
                    )}
                    aria-pressed={active}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {slotsLoading && (
              <div className="grid w-full grid-cols-[repeat(auto-fit,minmax(132px,1fr))] justify-center justify-items-center gap-3 md:gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-xl" />
                ))}
              </div>
            )}

            {!slotsLoading && selectedValid && displayedSlots.length > 0 && (
              <div
                data-testid="slots-grid"
                className="grid w-full grid-cols-[repeat(auto-fit,minmax(132px,1fr))] justify-items-center gap-3 md:gap-4"
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
                        'group relative grid h-12 w-full min-w-[120px] place-items-center rounded-xl border border-white/12 bg-transparent px-5 text-sm font-semibold leading-none text-zinc-100 transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900',
                        'hover:bg-white/5',
                        'transform-gpu animate-in fade-in-50 slide-in-from-bottom-1',
                        selectedSlot && 'scale-[1.03] border-white/70 bg-white/10 text-white shadow-[0_0_0_2px_rgba(255,255,255,0.28)]',
                        !selectedSlot && 'scale-[1] opacity-95',
                        'disabled:cursor-not-allowed disabled:border-white/10 disabled:text-zinc-500 disabled:hover:bg-transparent disabled:opacity-40'
                      )}
                      style={{ animationDelay }}
                      onClick={() => onSelectSlot(iso)}
                    >
                      <span className="w-full text-center [font-variant-numeric:tabular-nums] tracking-tight">{label}</span>
                      <Check
                        aria-hidden="true"
                        className={cn(
                          'pointer-events-none absolute right-2 h-3.5 w-3.5 text-white opacity-0 transition-all duration-200 ease-out',
                          selectedSlot ? 'translate-y-0 opacity-100' : '-translate-y-1'
                        )}
                      />
                    </button>
                  );
                })}
              </div>
            )}

            {!slotsLoading && (!selectedValid || displayedSlots.length === 0) && (
              <div className="flex h-full w-full flex-col items-center justify-center text-center text-xs text-zinc-400">
                {selectedValid ? 'No hay horarios disponibles en este tramo.' : 'Selecciona un día en el calendario para ver horarios disponibles.'}
              </div>
            )}

            {slotsError && !slotsLoading && (
              <div className="flex flex-col gap-2 rounded-xl border border-white/12 bg-background px-4 py-3 text-center">
                <div className="text-sm text-neutral-100">{slotsError}</div>
                <Button size="sm" onClick={onRetrySlots}>Reintentar</Button>
              </div>
            )}
          </aside>
        </div>

        <div className="flex w-full justify-end">
          <Button
            disabled={!canContinue}
            data-ready={canContinue}
            onClick={onNext}
            aria-disabled={!canContinue}
            className={cn(
              'inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-transparent px-6 text-sm font-medium text-zinc-100 shadow-[0_10px_30px_-20px_rgba(255,255,255,0.25)] ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
              canContinue
                ? 'border-white/60 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.3)] hover:border-white/70 hover:bg-white/10 focus-visible:ring-white/80'
                : 'hover:border-white/20 hover:bg-white/5'
            )}
          >
            {canContinue ? 'Continuar' : 'Selecciona un horario'}
          </Button>
        </div>

        {daysLoading && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-[24px] bg-black/55 backdrop-blur-sm">
            <div
              role="status"
              aria-live="polite"
              className="pointer-events-none flex w-full max-w-xs flex-col items-center gap-3 rounded-2xl border border-white/12 bg-background px-6 py-5 text-center shadow-[0_30px_80px_-45px_rgba(255,255,255,0.35)]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
                <Loader2 className="h-7 w-7 animate-spin text-white/90" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">Comprobando disponibilidad…</p>
                <p className="text-xs text-white/60">Sincronizando huecos libres.</p>
              </div>
            </div>
          </div>
        )}
        {daysError && !daysLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[24px] bg-black/70 backdrop-blur">
            <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-red-500/30 bg-background px-6 py-5 text-center shadow-[0_30px_80px_-45px_rgba(239,68,68,0.6)]">
              <div className="text-sm font-semibold text-red-200" role="status" aria-live="assertive">
                {daysError}
              </div>
              <Button
                size="sm"
                onClick={onRetryDays}
                className="border border-red-500/40 bg-red-500/10 text-red-100 hover:border-red-400/60 hover:bg-red-500/20"
              >
                Reintentar
              </Button>
            </div>
          </div>
        )}
      </div>
    </BookingLayout>
  );
};

export default BookDate;
