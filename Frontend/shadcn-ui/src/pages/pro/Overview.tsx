import { useCallback, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarClock, FileText, Loader2, Phone } from 'lucide-react';

import {
  api,
  ApiError,
  type ProAppointmentStatus,
  type ProOverview,
  type ProOverviewAppointment,
} from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProSession } from '@/store/pro';

const NO_SHOW_REASONS = [
  { value: 'late', label: 'Cliente no llegó a tiempo' },
  { value: 'no-contact', label: 'No respondió a la confirmación' },
  { value: 'personal', label: 'Motivo personal del cliente' },
];

const formatDate = (isoString: string) => {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
};

const OverviewPage = () => {
  const { toast } = useToast();
  const { session } = useProSession();
  const [showNoShowSelect, setShowNoShowSelect] = useState(false);
  const [noShowReason, setNoShowReason] = useState<string | null>(null);
  const layoutRef = useRef<HTMLDivElement>(null);
  const topSectionRef = useRef<HTMLElement>(null);
  const [appointmentsCardHeight, setAppointmentsCardHeight] = useState<number | null>(null);

  const stylist = session?.stylist;

  type AppointmentStatus = ProAppointmentStatus;
  type AppointmentEntry = {
    id: string;
    time: string;
    client: string;
    service: string;
    status: AppointmentStatus;
    phone?: string;
    lastVisit?: string;
    notes?: string;
    raw: ProOverviewAppointment;
  };

  const overviewQuery = useQuery<ProOverview, ApiError>({
    queryKey: ['pros', 'overview'],
    queryFn: api.prosOverview,
    enabled: Boolean(stylist),
    refetchInterval: 60_000,
    retry: 1,
  });

  const overview = overviewQuery.data;
  const overviewError = (overviewQuery.error as ApiError | undefined) ?? null;
  const overviewErrorMessage = overviewError?.message ?? null;
  const isInitialOverviewLoading = overviewQuery.isLoading && !overview;

  const formatHour = useCallback((iso: string | null | undefined) => {
    if (!iso) return '--:--';
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return '--:--';
    return new Intl.DateTimeFormat('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(dt);
  }, []);

  const mapAppointment = useCallback(
    (appointment: ProOverviewAppointment): AppointmentEntry => ({
      id: appointment.id,
      time: formatHour(appointment.start),
      client: appointment.client_name ?? 'Reserva sin nombre',
      service: appointment.service_name ?? appointment.service_id ?? 'Servicio por confirmar',
      status: appointment.status,
      phone: appointment.client_phone ?? undefined,
      lastVisit: appointment.last_visit ?? undefined,
      notes: appointment.notes ?? undefined,
      raw: appointment,
    }),
    [formatHour]
  );

  const appointments = useMemo<AppointmentEntry[]>(() => {
    if (!overview) return [];
    return overview.appointments.map(mapAppointment);
  }, [overview, mapAppointment]);

  const upcomingAppointment = useMemo<AppointmentEntry | null>(() => {
    if (overview?.upcoming) {
      return mapAppointment(overview.upcoming);
    }
    return appointments.find((apt) => apt.status !== 'cancelada') ?? appointments[0] ?? null;
  }, [overview, appointments, mapAppointment]);

  const summary = useMemo(() => {
    if (overview?.summary) {
      return overview.summary;
    }
    return appointments.reduce(
      (acc, apt) => {
        acc.total += 1;
        if (apt.status === 'confirmada') acc.confirmadas += 1;
        if (apt.status === 'pendiente') acc.pendientes += 1;
        if (apt.status === 'cancelada') acc.canceladas += 1;
        return acc;
      },
      { total: 0, confirmadas: 0, pendientes: 0, canceladas: 0 }
    );
  }, [overview, appointments]);

  const statusStyles: Record<AppointmentStatus, string> = {
    confirmada: 'bg-emerald-400/15 text-emerald-200 ring-emerald-400/30',
    pendiente: 'bg-amber-400/15 text-amber-200 ring-amber-400/30',
    cancelada: 'bg-rose-400/15 text-rose-200 ring-rose-400/30',
  };

  const statusTone: Record<AppointmentStatus, string> = {
    confirmada: 'text-emerald-300',
    pendiente: 'text-amber-300',
    cancelada: 'text-rose-300',
  };

  useLayoutEffect(() => {
    const updateAppointmentsCardHeight = () => {
      const layoutNode = layoutRef.current;
      if (!layoutNode) return;

      const isDesktop = window.innerWidth >= 1024; // >= lg breakpoint
      if (!isDesktop) {
        setAppointmentsCardHeight(null);
        return;
      }

      const layoutRect = layoutNode.getBoundingClientRect();
      const topHeight = topSectionRef.current?.getBoundingClientRect().height ?? 0;
      const styles = window.getComputedStyle(layoutNode);
      const gap = parseFloat(styles.rowGap || styles.gap || '0');
      const viewport = window.innerHeight;
      const offsetTop = layoutRect.top;
      const desiredBottomGap = Math.max(offsetTop, 32); // mirror top spacing when possible
      const available = viewport - offsetTop - topHeight - gap - desiredBottomGap;

      if (!Number.isFinite(available) || available <= 0) {
        setAppointmentsCardHeight(null);
        return;
      }

      const minHeight = 360;
      if (available < minHeight) {
        setAppointmentsCardHeight(null);
        return;
      }

      setAppointmentsCardHeight(Math.round(available));
    };

    updateAppointmentsCardHeight();
    window.addEventListener('resize', updateAppointmentsCardHeight);
    return () => window.removeEventListener('resize', updateAppointmentsCardHeight);
  }, []);

  const handleAppointmentAction = (
    action: 'attended' | 'no-show' | 'reschedule',
    detail?: string
  ) => {
    const labels = {
      attended: 'Marcada como asistida',
      'no-show': 'Marcada como no asistida',
      reschedule: 'Abriremos la reprogramación pronto',
    } as const;
    toast({
      title: labels[action],
      description: detail ?? 'Prototipo temporal: los cambios se guardarán en una próxima iteración.',
    });
  };

  const openAppointmentDetail = (id: string) => {
    toast({
      title: 'Detalle en construcción',
      description: `Abriremos la cita ${id} en breve.`,
    });
  };

  const handleNoShowReasonSelect = (value: string) => {
    const reason = NO_SHOW_REASONS.find((item) => item.value === value)?.label ?? value;
    setNoShowReason(value);
    setShowNoShowSelect(false);
    handleAppointmentAction('no-show', `Motivo seleccionado: ${reason}`);
  };


  if (!stylist) {
    return (
      <div className="flex min-h-[320px] items-center justify-center text-sm text-white/70">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Cargando portal...
      </div>
    );
  }

  return (
    <div ref={layoutRef} className="flex flex-col gap-4">
      <section ref={topSectionRef} className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="rounded-3xl ring-1 ring-white/10 bg-white/5 shadow-lg shadow-emerald-900/25">
          <CardContent className="flex flex-col justify-between gap-4 p-4 text-sm leading-6 md:flex-row md:items-stretch md:gap-6 md:p-6">
            {isInitialOverviewLoading ? (
              <div className="flex h-36 w-full items-center justify-center text-sm text-white/70">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Cargando próximas citas...
              </div>
            ) : upcomingAppointment ? (
              <>
                <div className="flex w-full flex-col gap-2">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-white/55">Próxima cita</p>
                  <h1
                    className="truncate text-[26px] font-semibold text-white md:text-[28px]"
                    title={upcomingAppointment.client}
                  >
                    {upcomingAppointment.client}
                  </h1>
                  <div className="space-y-1.5 text-white/80">
                    <div className="flex flex-wrap items-center gap-2 text-sm tabular-nums">
                      <span>{upcomingAppointment.time} h</span>
                      <span className="hidden text-white/40 sm:inline">•</span>
                      <span className={`capitalize ${statusTone[upcomingAppointment.status]}`}>
                        {upcomingAppointment.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="truncate" title={upcomingAppointment.service}>
                        {upcomingAppointment.service}
                      </span>
                    </div>
                  </div>
                  {(() => {
                    const metadataItems: Array<{ icon: ReactNode; label: string; title?: string }> = [];
                    if (upcomingAppointment.phone) {
                      metadataItems.push({
                        icon: <Phone className="h-4 w-4 text-white/60" aria-hidden="true" />,
                        label: upcomingAppointment.phone,
                        title: upcomingAppointment.phone,
                      });
                    }
                    if (upcomingAppointment.lastVisit) {
                      const formatted = formatDate(upcomingAppointment.lastVisit);
                      metadataItems.push({
                        icon: <CalendarClock className="h-4 w-4 text-white/60" aria-hidden="true" />,
                            label: `Última visita: ${formatted}`,
                            title: `Última visita: ${formatted}`,
                      });
                    }
                    if (upcomingAppointment.notes) {
                      metadataItems.push({
                        icon: <FileText className="h-4 w-4 text-white/60" aria-hidden="true" />,
                        label: upcomingAppointment.notes,
                        title: upcomingAppointment.notes,
                      });
                    }
                    if (!metadataItems.length) return null;
                    return (
                      <div className="mt-2 space-y-1.5 text-sm text-white/70">
                        {metadataItems.map((item, index) => (
                          <p key={index} className="flex items-center gap-2 truncate" title={item.title}>
                            {item.icon}
                            <span className="truncate">{item.label}</span>
                          </p>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                <div className="flex w-full flex-col gap-2 md:h-full md:w-[200px] md:justify-center md:self-center">
                  <Button
                    variant="outline"
                    className="h-9 w-full rounded-full border-emerald-400/60 px-4 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/10"
                    onClick={() => {
                      setShowNoShowSelect(false);
                      handleAppointmentAction('attended');
                    }}
                  >
                    Marcar como asistida
                  </Button>
                  <div className="flex w-full flex-col gap-1.5">
                    <Button
                      variant="outline"
                      className="h-9 w-full rounded-full border-rose-400/60 px-4 text-sm font-semibold text-rose-200 hover:bg-rose-500/10"
                      onClick={() => {
                        setShowNoShowSelect((prev) => !prev);
                        setNoShowReason(null);
                      }}
                    >
                      No asistió
                    </Button>
                    {showNoShowSelect && (
                      <Select value={noShowReason ?? undefined} onValueChange={handleNoShowReasonSelect}>
                        <SelectTrigger className="h-9 w-full rounded-full border border-white/15 bg-white/5 text-left text-sm font-medium text-white/80 hover:bg-white/10">
                          <SelectValue placeholder="Selecciona motivo" />
                        </SelectTrigger>
                        <SelectContent align="end" className="min-w-[220px] md:min-w-[260px]">
                          {NO_SHOW_REASONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    className="h-9 w-full rounded-full border-white/25 px-4 text-sm font-semibold text-white/80 hover:bg-white/10"
                    onClick={() => {
                      setShowNoShowSelect(false);
                      handleAppointmentAction('reschedule');
                    }}
                  >
                    Mover cita
                  </Button>
                </div>
              </>
            ) : overviewErrorMessage ? (
              <p className="text-sm text-rose-200/80">{overviewErrorMessage}</p>
            ) : (
              <p className="text-sm text-white/60">No hay próximas citas programadas.</p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl ring-1 ring-white/10 bg-white/5 p-3 shadow-sm">
          <CardHeader className="p-0">
            <CardTitle className="text-sm font-semibold text-white">Resumen del día</CardTitle>
            <CardDescription className="text-[11px] text-white/70">
              Una vista rápida de cómo va tu agenda hoy.
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-2 space-y-2 p-0">
            {isInitialOverviewLoading ? (
              <div className="space-y-3">
                <div className="h-16 rounded-2xl bg-white/5/80 animate-pulse" />
                <div className="space-y-2 text-[11px]">
                  <div className="h-5 rounded-full bg-white/5/70 animate-pulse" />
                  <div className="h-5 rounded-full bg-white/5/70 animate-pulse" />
                  <div className="h-5 rounded-full bg-white/5/70 animate-pulse" />
                </div>
              </div>
            ) : (
              <>
                <div className="rounded-2xl bg-white/5 p-2.5 text-center">
                  <p className="text-[11px] text-white/60">Total de citas</p>
                  <p className="text-xl font-semibold text-white tabular-nums">{summary.total}</p>
                </div>
                <div className="space-y-1.5 text-[11px] text-white/80">
                  <div className="flex items-center justify-between">
                    <span>Confirmadas</span>
                    <span className="inline-flex items-center rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-medium text-emerald-200 ring-1 ring-emerald-400/30 tabular-nums">
                      {summary.confirmadas}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Pendientes</span>
                    <span className="inline-flex items-center rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-medium text-amber-200 ring-1 ring-amber-400/30 tabular-nums">
                      {summary.pendientes}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Canceladas</span>
                    <span className="inline-flex items-center rounded-full bg-rose-400/15 px-2 py-0.5 text-[10px] font-medium text-rose-200 ring-1 ring-rose-400/30 tabular-nums">
                      {summary.canceladas}
                    </span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>

  <section className="flex flex-col min-h-0">
        <Card
          className="flex flex-col overflow-hidden rounded-2xl ring-1 ring-white/10 bg-white/5 p-6 shadow-sm"
          style={appointmentsCardHeight ? { height: `${appointmentsCardHeight}px` } : undefined}
        >
          <CardHeader className="p-0">
            <CardTitle className="text-lg font-semibold text-white">Citas de hoy</CardTitle>
            <CardDescription className="text-sm text-white/70">
              Haz clic en cualquier reserva para ver más detalles (próximamente).
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-6 flex flex-1 min-h-0 overflow-hidden p-0">
            {isInitialOverviewLoading ? (
              <div className="flex h-full min-h-[220px] flex-1 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/5 text-sm text-white/70">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Cargando agenda de hoy...
              </div>
            ) : overviewErrorMessage && appointments.length === 0 ? (
              <div className="flex h-full min-h-[220px] flex-1 items-center justify-center rounded-2xl border border-dashed border-rose-400/25 bg-rose-400/5 px-4 text-center text-sm text-rose-50/80">
                <p>{overviewErrorMessage}</p>
              </div>
            ) : summary.total > 0 ? (
              <ScrollArea
                className="flex-1 h-full min-h-0"
                type="auto"
                scrollbarClassName="hidden"
                thumbClassName="hidden"
              >
                <div className="flex h-full min-h-0 flex-col">
                  <div className="grid flex-1 content-start gap-3 py-2 sm:grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3">
                    {appointments.map((appointment) => (
                      <button
                        key={appointment.id}
                        type="button"
                        onClick={() => openAppointmentDetail(appointment.id)}
                        className="flex w-full flex-col gap-2 rounded-xl border border-white/10 bg-white/0 px-4 py-3 text-left transition hover:border-white/20 hover:bg-white/5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-white/80">
                          <span className="font-medium tabular-nums text-white/90">{appointment.time}</span>
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ${statusStyles[appointment.status]}`}>
                            {appointment.status}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-white/70">
                          <span className="font-semibold text-white">{appointment.client}</span>
                          <span className="hidden text-white/40 sm:inline">•</span>
                          <span>{appointment.service}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className={`${appointments.length ? 'mt-6' : 'mt-4'} pb-4 pt-2`}>
                    <p className="rounded-xl border border-dashed border-emerald-400/25 bg-emerald-400/5 px-4 py-3 text-center text-sm text-emerald-50/80">
                      No hay más citas previstas para hoy. ¡Disfruta el cierre del día!
                    </p>
                  </div>
                </div>
              </ScrollArea>
            ) : (
              <div className="flex min-h-[220px] flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/5 text-center text-sm text-white/70">
                <p>Este día está libre. Crea una nueva cita o marca un hueco disponible.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default OverviewPage;
