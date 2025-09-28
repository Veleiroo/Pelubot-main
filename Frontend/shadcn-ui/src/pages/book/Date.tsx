import { useLocation, useNavigate } from 'react-router-dom';
import { useBooking } from '@/store/booking';
import { useEffect, useMemo, useState, useCallback } from 'react';
import type { KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
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
  const selectedHuman = selected ? format(selected, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es }) : undefined;

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

  const onSelectSlot = (iso: string) => {
    setSlot(iso);
  };

  return (
    <BookingLayout
      step={2}
      title="Selecciona fecha y hora"
      summary={resolvedServiceLabel || undefined}
    >
  <div className="mx-auto w-full max-w-[920px]">
        <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900/80 shadow-[0_20px_80px_-60px_rgba(0,0,0,0.75)]">
          <div className="p-5 md:p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-white md:text-xl">Selecciona fecha y hora</h3>
              <p className="mt-1 text-xs text-zinc-400 md:text-sm">Elige un día y después un horario disponible.</p>
            </div>

            {noProfessionals && (
              <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200" aria-live="polite">
                Por ahora ningún profesional ofrece este servicio. Puedes elegir otro servicio o volver más tarde.
              </div>
            )}

            <div className="mt-6 grid gap-6 md:grid-cols-[2fr,1fr] md:gap-8">
              <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
                <CalendarNav month={month} onPrev={onPrevMonth} onNext={onNextMonth} />

                <div className="mt-4 grid grid-cols-7 gap-1.5 text-center text-[11px] uppercase tracking-wide text-white/50">
                  {['lu','ma','mi','ju','vi','sá','do'].map((w) => (
                    <div key={w} className="grid h-8 place-items-center text-xs font-medium">{w}</div>
                  ))}
                </div>

                <div
                  key={`${month.getFullYear()}-${month.getMonth()}`}
                  role="grid"
                  aria-label={format(month, 'LLLL yyyy', { locale: es })}
                  className="mt-3 grid grid-cols-7 gap-1.5"
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
                    const showDot = (enabled || selectedDay) && inMonth;

                    const dayClasses = cn(
                      'flex h-10 w-10 flex-col items-center justify-center gap-1 rounded-lg text-[13px] font-medium leading-none transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background md:h-11 md:w-11',
                      '[font-variant-numeric:tabular-nums] shadow-none',
                      isWeekend ? 'text-white/70' : 'text-white/80',
                      !inMonth && 'cursor-not-allowed text-white/25 opacity-80 hover:bg-transparent',
                      inMonth && !enabled && 'cursor-not-allowed text-white/40 opacity-70 hover:bg-transparent',
                      enabled && inMonth && !selectedDay && 'hover:bg-white/5',
                      selectedDay && 'bg-emerald-500 text-white shadow-[0_0_0_3px] shadow-emerald-500/25 hover:bg-emerald-500',
                      isToday(d) && !selectedDay && 'outline outline-1 outline-white/15'
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
                          <span
                            aria-hidden="true"
                            className={cn(
                              'h-1.5 w-1.5 rounded-full transition-opacity',
                              selectedDay ? 'bg-white opacity-100' : 'bg-emerald-400',
                              showDot ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <p className="mt-4 text-xs text-zinc-400">Selecciona un día para ver horarios disponibles.</p>
              </section>

              <aside className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
                <div className="space-y-2">
                  <Label htmlFor="professional-select" className="text-xs text-zinc-400">
                    Profesional
                  </Label>
                  <Select
                    value={professionalId ?? ANY_PRO}
                    onValueChange={(v) => {
                      const nextId = v === ANY_PRO ? null : v;
                      const nextName = nextId ? pros.find((p) => p.id === nextId)?.name ?? null : null;
                      setProfessional(nextId, nextName);
                      setDate('');
                    }}
                  >
                    <SelectTrigger id="professional-select" className="w-full" aria-label="Seleccionar profesional">
                      <SelectValue placeholder="Cualquiera" />
                    </SelectTrigger>
                    <SelectContent align="end">
                      <SelectItem value={ANY_PRO}>Cualquiera</SelectItem>
                      {pros.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-white">Selecciona un horario</h4>
                  <p className="text-xs text-zinc-400">Elige un día y después una hora disponible.</p>
                </div>

                <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-900/60 p-1">
                  <button
                    type="button"
                    disabled={!selectedValid || morningSlots.length === 0}
                    onClick={() => setRange('morning')}
                    className={cn(
                      'h-9 px-3 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
                      'border border-transparent text-zinc-300 hover:bg-zinc-800/60',
                      range === 'morning' && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 shadow-[0_0_0_1px] shadow-emerald-500/15',
                      (!selectedValid || morningSlots.length === 0) && 'cursor-not-allowed opacity-40'
                    )}
                  >
                    Mañana
                  </button>
                  <button
                    type="button"
                    disabled={!selectedValid || afternoonSlots.length === 0}
                    onClick={() => setRange('afternoon')}
                    className={cn(
                      'h-9 px-3 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
                      'border border-transparent text-zinc-300 hover:bg-zinc-800/60',
                      range === 'afternoon' && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 shadow-[0_0_0_1px] shadow-emerald-500/15',
                      (!selectedValid || afternoonSlots.length === 0) && 'cursor-not-allowed opacity-40'
                    )}
                  >
                    Tarde
                  </button>
                </div>

                {slotsLoading && (
                  <div className="grid grid-cols-2 gap-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-9 rounded-xl" />
                    ))}
                  </div>
                )}

                {!slotsLoading && (
                  <>
                    {selectedValid ? (
                      displayedSlots.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2 xl:grid-cols-3 2xl:grid-cols-4">
                          {displayedSlots.map((iso) => {
                            const selectedSlot = slotStart === iso;
                            const slotDate = new Date(iso);
                            const label = Number.isNaN(slotDate.getTime())
                              ? iso.slice(11, 16)
                              : format(slotDate, "HH:mm'h'", { locale: es });
                            return (
                              <button
                                key={iso}
                                type="button"
                                aria-pressed={selectedSlot}
                                data-selected={selectedSlot}
                                className={cn(
                                  'h-9 rounded-xl border border-emerald-500/30 px-4 text-sm font-medium text-emerald-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
                                  'bg-transparent hover:bg-emerald-500/10',
                                  selectedSlot && 'bg-emerald-500/20 text-emerald-100 shadow-[0_0_0_2px] shadow-emerald-500/20'
                                )}
                                onClick={() => onSelectSlot(iso)}
                              >
                                {label}
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

                {selectedHuman && (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-xs text-emerald-200">
                    <p className="font-medium">{selectedHuman}</p>
                    {slotStart && (
                      <p>Horario seleccionado: {format(new Date(slotStart), "HH:mm'h'", { locale: es })}</p>
                    )}
                  </div>
                )}
              </aside>
            </div>

            <div className="sticky bottom-0 mt-6 -mx-5 flex flex-col gap-3 border-t border-zinc-800 bg-zinc-900/85 px-5 py-4 backdrop-blur-sm md:-mx-6 md:flex-row md:justify-end md:px-6 rounded-b-2xl">
              <Button
                variant="outline"
                onClick={goBackToBackground}
                className="h-10 rounded-xl border-zinc-700 bg-zinc-900 px-4 text-zinc-100 transition hover:border-emerald-400/50"
              >
                Cambiar servicio
              </Button>
              <Button
                disabled={!canContinue}
                onClick={onNext}
                aria-disabled={!canContinue}
                className="h-10 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-5 text-emerald-200 shadow-soft transition hover:bg-emerald-500/20 disabled:pointer-events-none disabled:opacity-60"
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
