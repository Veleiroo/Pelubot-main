import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CalendarClock, FileText, Loader2, LogOut, Phone } from 'lucide-react';

import { api, ApiError, type StylistPublic } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
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
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session, setSession, clearSession } = useProSession();
  const [showNoShowSelect, setShowNoShowSelect] = useState(false);
  const [noShowReason, setNoShowReason] = useState<string | null>(null);

  const sessionQuery = useQuery<{ stylist: StylistPublic; session_expires_at: string }, ApiError>({
    queryKey: ['pros', 'me'],
    queryFn: api.prosMe,
    enabled: !session,
    retry: false,
  });

  useEffect(() => {
    if (sessionQuery.data) {
      setSession({ stylist: sessionQuery.data.stylist, sessionExpiresAt: sessionQuery.data.session_expires_at });
    }
  }, [sessionQuery.data, setSession]);

  useEffect(() => {
    if (!sessionQuery.error) return;
    if (sessionQuery.error.status === 401) {
      clearSession();
      navigate('/pros/login', { replace: true });
      return;
    }
    toast({
      title: 'No pudimos actualizar tus datos',
      description: sessionQuery.error.message,
    });
  }, [sessionQuery.error, toast, clearSession, navigate]);

  const logout = useMutation({
    mutationFn: api.prosLogout,
    onSuccess: () => {
      clearSession();
      toast({ title: 'Sesión cerrada' });
      navigate('/pros/login', { replace: true });
    },
    onError: (error: unknown) => {
      const detail = error instanceof ApiError ? error.message : 'No se pudo cerrar sesión.';
      toast({
        title: 'Error al cerrar sesión',
        description: detail,
      });
    },
  });

  const stylist = session?.stylist ?? sessionQuery.data?.stylist;

  const appointmentsToday = useMemo(
    () => [
      {
        id: 'apt-1',
        time: '09:30',
        client: 'Laura Pérez',
        service: 'Corte y peinado',
        status: 'confirmada' as const,
        phone: '+34 612 345 678',
        lastVisit: '2025-09-12',
        notes: 'Prefiere asiento cerca de la ventana.'
      },
      {
        id: 'apt-2',
        time: '11:00',
        client: 'Marta López',
        service: 'Coloración parcial',
        status: 'pendiente' as const,
      },
      {
        id: 'apt-3',
        time: '13:15',
        client: 'Andrea Vidal',
        service: 'Tratamiento hidratante',
        status: 'confirmada' as const,
      },
      {
        id: 'apt-4',
        time: '16:45',
        client: 'Sara Núñez',
        service: 'Recogido evento',
        status: 'cancelada' as const,
      },
    ],
    []
  );

  const upcomingAppointment = appointmentsToday[0];
  const summary = useMemo(() => {
    const total = appointmentsToday.length;
    const confirmadas = appointmentsToday.filter((apt) => apt.status === 'confirmada').length;
    const pendientes = appointmentsToday.filter((apt) => apt.status === 'pendiente').length;
    const canceladas = appointmentsToday.filter((apt) => apt.status === 'cancelada').length;
    return { total, confirmadas, pendientes, canceladas };
  }, [appointmentsToday]);

  const statusStyles: Record<typeof appointmentsToday[number]['status'], string> = {
    confirmada: 'bg-emerald-400/15 text-emerald-200 ring-emerald-400/30',
    pendiente: 'bg-amber-400/15 text-amber-200 ring-amber-400/30',
    cancelada: 'bg-rose-400/15 text-rose-200 ring-rose-400/30',
  };

  const statusTone: Record<typeof appointmentsToday[number]['status'], string> = {
    confirmada: 'text-emerald-300',
    pendiente: 'text-amber-300',
    cancelada: 'text-rose-300',
  };

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
      <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(130deg,rgba(16,185,129,0.18)_0%,rgba(15,118,110,0.06)_48%,rgba(15,23,42,0)_100%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(210deg,rgba(59,130,246,0.12)_0%,rgba(15,23,42,0)_60%)] mix-blend-screen" />
        <div className="relative z-10 flex items-center gap-2 text-sm text-white/80">
          <Loader2 className="h-5 w-5 animate-spin" />
          Cargando portal...
        </div>
      </div>
    );
  }

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(130deg,rgba(16,185,129,0.18)_0%,rgba(15,118,110,0.06)_48%,rgba(15,23,42,0)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(210deg,rgba(59,130,246,0.12)_0%,rgba(15,23,42,0)_60%)] mix-blend-screen" />

      <main className="relative z-10 mx-auto w-full max-w-6xl px-6 py-8 sm:px-8">
        <div className="flex flex-col gap-8">
          <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Card className="rounded-3xl ring-1 ring-white/10 bg-white/5 shadow-lg shadow-emerald-900/25">
              <CardContent className="flex min-h-[260px] flex-col justify-between gap-10 p-8 text-base leading-7 md:flex-row md:items-center md:p-12 md:text-lg">
                {upcomingAppointment ? (
                  <>
                    <div className="flex w-full flex-col gap-4">
                      <p className="text-xs uppercase tracking-[0.3em] text-white/55">Próxima cita</p>
                      <h1
                        className="truncate text-3xl font-semibold text-white md:text-4xl"
                        title={upcomingAppointment.client}
                      >
                        {upcomingAppointment.client}
                      </h1>
                      <div className="space-y-3 text-white/80">
                        <div className="flex flex-wrap items-center gap-3 text-base tabular-nums">
                          <span>{upcomingAppointment.time} h</span>
                          <span className="text-white/40">•</span>
                          <span className={`capitalize ${statusTone[upcomingAppointment.status]}`}>
                            {upcomingAppointment.status}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-base">
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
                          <div className="mt-4 space-y-2 text-base text-white/70">
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

                    <div className="flex w-full flex-col gap-3 md:w-[260px]">
                      <Button
                        variant="outline"
                        className="h-12 w-full rounded-full border-emerald-400/60 px-6 text-base font-semibold text-emerald-200 hover:bg-emerald-500/10"
                        onClick={() => {
                          setShowNoShowSelect(false);
                          handleAppointmentAction('attended');
                        }}
                      >
                        Marcar como asistida
                      </Button>
                      <div className="flex w-full flex-col gap-2">
                        <Button
                          variant="outline"
                          className="h-12 w-full rounded-full border-rose-400/60 px-6 text-base font-semibold text-rose-200 hover:bg-rose-500/10"
                          onClick={() => {
                            setShowNoShowSelect((prev) => !prev);
                            setNoShowReason(null);
                          }}
                        >
                          No asistió
                        </Button>
                        {showNoShowSelect && (
                          <Select value={noShowReason ?? undefined} onValueChange={handleNoShowReasonSelect}>
                            <SelectTrigger className="h-12 w-full rounded-full border border-white/15 bg-white/5 text-left text-base font-medium text-white/80 hover:bg-white/10">
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
                        className="h-12 w-full rounded-full border-white/25 px-6 text-base font-semibold text-white/80 hover:bg-white/10"
                        onClick={() => {
                          setShowNoShowSelect(false);
                          handleAppointmentAction('reschedule');
                        }}
                      >
                        Mover cita
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-white/60">No hay próximas citas programadas.</p>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl ring-1 ring-white/10 bg-white/5 p-6 shadow-sm">
              <CardHeader className="p-0">
                <CardTitle className="text-lg font-semibold text-white">Resumen del día</CardTitle>
                <CardDescription className="text-sm text-white/70">
                  Una vista rápida de cómo va tu agenda hoy.
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-6 space-y-4 p-0">
                <div className="rounded-2xl bg-white/5 p-4 text-center">
                  <p className="text-sm text-white/60">Total de citas</p>
                  <p className="text-3xl font-semibold text-white tabular-nums">{summary.total}</p>
                </div>
                <div className="space-y-3 text-sm text-white/80">
                  <div className="flex items-center justify-between">
                    <span>Confirmadas</span>
                    <span className="inline-flex items-center rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-medium text-emerald-200 ring-1 ring-emerald-400/30 tabular-nums">
                      {summary.confirmadas}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Pendientes</span>
                    <span className="inline-flex items-center rounded-full bg-amber-400/15 px-3 py-1 text-xs font-medium text-amber-200 ring-1 ring-amber-400/30 tabular-nums">
                      {summary.pendientes}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Canceladas</span>
                    <span className="inline-flex items-center rounded-full bg-rose-400/15 px-3 py-1 text-xs font-medium text-rose-200 ring-1 ring-rose-400/30 tabular-nums">
                      {summary.canceladas}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section>
            <Card className="rounded-2xl ring-1 ring-white/10 bg-white/5 p-6 shadow-sm">
              <CardHeader className="p-0">
                <CardTitle className="text-lg font-semibold text-white">Citas de hoy</CardTitle>
                <CardDescription className="text-sm text-white/70">
                  Haz clic en cualquier reserva para ver más detalles (próximamente).
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-6 space-y-3 p-0">
                {appointmentsToday.map((appointment) => (
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
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </div>
  );
};

export default OverviewPage;
