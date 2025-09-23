import { useLocation, useNavigate } from 'react-router-dom';
import { useBooking } from '@/store/booking';
import { useEffect, useMemo, useState, useCallback } from 'react';
import type { KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { api, type Service } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { addDays, addMonths, endOfMonth, endOfWeek, format, isAfter, isBefore, isSameDay, isSameMonth, isToday, startOfMonth, startOfWeek, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarNav } from '@/components/ui/CalendarNav';
import '@/styles/calendar.css';
import { BookingLayout } from '@/components/BookingLayout';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { buildBookingState, getBackgroundLocation } from '@/lib/booking-route';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

  const slots = slotsData?.slots ?? [];
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

  const firstAvailablePeriod = useMemo<PeriodValue>(() => {
    const found = PERIOD_DEFINITIONS.find((p) => slotsByPeriod[p.value].length > 0)?.value;
    return found ?? 'manana';
  }, [slotsByPeriod]);

  const [activePeriod, setActivePeriod] = useState<PeriodValue>(firstAvailablePeriod);

  useEffect(() => {
    setActivePeriod(firstAvailablePeriod);
  }, [firstAvailablePeriod]);

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
      {noProfessionals && (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200" aria-live="polite">
          Por ahora ningún profesional ofrece este servicio. Puedes elegir otro servicio o volver más tarde.
        </div>
      )}

      {/* Calendario accesible con grid propio */}
      <div className="relative">
        <Card className="w-full rounded-2xl border border-white/10 bg-neutral-900/95 shadow-xl">
          <CardContent className="p-5 md:p-6">
            <CalendarNav month={month} onPrev={onPrevMonth} onNext={onNextMonth} />

            <div className="mx-auto w-full max-w-[360px] md:max-w-[440px]">
              <div className="mb-3 grid grid-cols-7 gap-1 text-center text-[11px] uppercase tracking-wide text-white/50 md:mb-4">
                {['lu','ma','mi','ju','vi','sá','do'].map((w) => (
                  <div key={w} className="grid h-8 place-items-center">{w}</div>
                ))}
              </div>

              <div
                key={`${month.getFullYear()}-${month.getMonth()}`}
                role="grid"
                aria-label={format(month, 'LLLL yyyy', { locale: es })}
                className="cal-fade grid grid-cols-7 gap-1"
                style={{ aspectRatio: '1 / 1' }}
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
                    'size-9 md:size-10 grid place-items-center rounded-lg text-white/80 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    '[font-variant-numeric:tabular-nums]',
                    isWeekend ? 'text-white/60' : 'text-white/80',
                    !inMonth && 'cursor-not-allowed text-white/30 opacity-60 hover:bg-transparent',
                    inMonth && !enabled && 'cursor-not-allowed text-white/30 opacity-60 hover:bg-transparent',
                    enabled && inMonth && !selectedDay && 'hover:bg-white/5',
                    selectedDay && 'bg-emerald-500 text-white shadow-[0_0_0_3px] shadow-emerald-500/20 hover:bg-emerald-500',
                    isToday(d) && !selectedDay && 'outline outline-1 outline-white/10'
                  );

                  return (
                    <div key={ymd} className="grid place-items-center h-10">
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
                        {String(d.getDate())}
                      </button>
                    </div>
                  );
              })}
              </div>
            </div>
          </CardContent>
        </Card>

        {daysLoading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40">
            <div className="rounded-lg bg-neutral-800 px-3 py-2 text-sm text-neutral-200" role="status" aria-live="polite">
              Comprobando disponibilidad…
            </div>
          </div>
        )}
        {daysError && !daysLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-black/60">
            <div className="text-sm text-neutral-200" role="status" aria-live="assertive">{daysError}</div>
            <Button size="sm" onClick={onRetryDays}>Reintentar</Button>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        <Label htmlFor="professional-select" className="text-xs font-medium text-white/60">
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
          <SelectTrigger id="professional-select" className="w-64" aria-label="Seleccionar profesional">
            <SelectValue placeholder="Cualquiera" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY_PRO}>Cualquiera</SelectItem>
            {pros.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Horarios disponibles */}
      <Card className="mt-5 rounded-2xl border border-white/10 bg-neutral-900/95 shadow-xl">
        <CardContent className="p-5 md:p-6">
          <div className="flex flex-col gap-1 text-left">
            <div className="text-sm text-white/70 md:text-base">
              {selectedHuman ? 'Horarios disponibles para ' : ''}
              <span className="font-medium text-white">{selectedHuman ?? 'Selecciona una fecha'}</span>
            </div>
            {selectedValid && (
              <p className="text-xs text-white/50">Haz clic en un horario para continuar</p>
            )}
          </div>

          {slotsLoading && (
            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 md:gap-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="h-9 rounded-xl" />
              ))}
            </div>
          )}

          {!slotsLoading && selectedValid && (
            <div className="mt-4">
              <Tabs
                value={activePeriod}
                onValueChange={(value) => setActivePeriod(value as PeriodValue)}
              >
                <TabsList className="grid h-auto w-full grid-cols-3 gap-2 rounded-xl bg-white/5 p-1 text-xs text-white/70 md:text-sm">
                  {PERIOD_DEFINITIONS.map((period) => {
                    const periodSlots = slotsByPeriod[period.value];
                    const isEmpty = periodSlots.length === 0;
                    return (
                      <TabsTrigger
                        key={period.value}
                        value={period.value}
                        className={cn(
                          'rounded-lg px-3 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
                          'text-white/70 hover:bg-white/10 hover:text-white',
                          'data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-[0_0_0_2px] data-[state=active]:shadow-emerald-500/20',
                          isEmpty && 'opacity-45'
                        )}
                      >
                        {period.label}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
                {PERIOD_DEFINITIONS.map((period) => {
                  const periodSlots = slotsByPeriod[period.value];
                  return (
                    <TabsContent key={period.value} value={period.value} className="mt-3 outline-none">
                      {periodSlots.length === 0 ? (
                        <p className="py-6 text-center text-xs text-white/50">No hay horarios en este tramo.</p>
                      ) : (
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 md:gap-3">
                          {periodSlots.map((iso) => {
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
                                  'rounded-full px-3.5 py-2 text-xs md:text-sm text-white/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
                                  'bg-white/5 hover:bg-white/10',
                                  selectedSlot && 'bg-emerald-500 text-white shadow-[0_0_0_3px] shadow-emerald-500/20 hover:bg-emerald-500'
                                )}
                                onClick={() => onSelectSlot(iso)}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </TabsContent>
                  );
                })}
              </Tabs>
              {slots.length === 0 && (
                <p className="mt-3 text-center text-xs text-white/50">
                  No hay horarios disponibles para esta fecha. Intenta con otra fecha o profesional.
                </p>
              )}
            </div>
          )}

          {!slotsLoading && !selectedValid && (
            <p className="mt-4 text-center text-xs text-white/50">
              Selecciona una fecha en el calendario para ver horarios disponibles.
            </p>
          )}
        </CardContent>
        {slotsError && !slotsLoading && (
          <div className="flex flex-col items-center gap-2 px-4 pb-4">
            <div className="text-sm text-neutral-200">{slotsError}</div>
            <Button size="sm" onClick={onRetrySlots}>Reintentar</Button>
          </div>
        )}
      </Card>

      {!canContinue && selectedValid && (
        <p className="mt-4 text-sm font-medium text-amber-300" role="alert">
          Selecciona un horario disponible para continuar.
        </p>
      )}

      <div className="mt-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
        <Button
          onClick={goBackToBackground}
          className="w-full bg-brand text-white hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-auto"
        >
          Cambiar servicio
        </Button>
        <Button
          disabled={!canContinue}
          onClick={onNext}
          aria-disabled={!canContinue}
          className="w-full rounded-xl bg-brand px-6 py-2 text-black shadow-soft transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-60 sm:w-auto"
        >
          {canContinue ? 'Continuar' : 'Selecciona un horario'}
        </Button>
      </div>
    </BookingLayout>
  );
};

export default BookDate;
