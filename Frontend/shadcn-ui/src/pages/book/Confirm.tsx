import { useEffect, useMemo, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useBooking } from '@/store/booking';
import { Button } from '@/components/ui/button';
import { api, ApiError } from '@/lib/api';
import { toast } from '@/components/ui/sonner';
import { BookingLayout } from '@/components/BookingLayout';
import { Card, CardContent } from '@/components/ui/card';
import { fmtEuro, fmtDateLong, fmtTime } from '@/lib/format';
import { CheckCircle2, Calendar, Clock, User, Scissors, ArrowLeft } from '@/lib/icons';
import { buildBookingState } from '@/lib/booking-route';
import { Skeleton } from '@/components/ui/skeleton';

const formatDateTime = (iso: string) => `${fmtDateLong(iso)}, ${fmtTime(iso)}h`;

type ConfirmLocationState = {
  serviceId?: string;
  serviceName?: string;
  professionalId?: string | null;
  professionalName?: string | null;
  slotStart?: string;
};

const BookConfirm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    serviceId,
    serviceName,
    professionalId,
    professionalName,
    slotStart,
    reset,
    setService,
    setProfessional,
    setSlot,
  } = useBooking();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [services, setServices] = useState<{ id: string; name: string; duration_min: number; price_eur: number }[]>([]);
  const [pros, setPros] = useState<{ id: string; name: string }[]>([]);
  const [catalogReady, setCatalogReady] = useState(false);

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const serviceNameParam = params.get('service_name') || undefined;
  const proNameParam = params.get('pro_name') || undefined;
  const locationState = useMemo(
    () => (location.state ?? null) as ConfirmLocationState | null,
    [location.state]
  );

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const svc = await api.getServices();
        if (active) setServices(svc);
      } catch {
        /* noop */
      }
      try {
        const profs = await api.getProfessionals();
        if (active) setPros(profs);
      } catch {
        /* noop */
      }
      if (active) setCatalogReady(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  const service = useMemo(() => services.find((s) => s.id === serviceId), [services, serviceId]);
  const professional = useMemo(() => pros.find((p) => p.id === professionalId), [pros, professionalId]);
  const serviceLabel = service?.name || serviceNameParam || locationState?.serviceName || serviceName || serviceId;
  const professionalLabel = professional?.name || proNameParam || locationState?.professionalName || professionalName || (professionalId ? professionalId : 'Cualquiera disponible');
  const summaryLoading = !catalogReady;

  useEffect(() => {
    if (serviceId && slotStart) return;
    const sid = params.get('service') || locationState?.serviceId || undefined;
    const start = params.get('start') || locationState?.slotStart || undefined;
    const pro = params.get('pro');
    const resolvedPro = pro !== null ? pro : locationState?.professionalId ?? null;
    const resolvedProName = proNameParam || locationState?.professionalName || professional?.name || professionalName || null;

    if (sid) setService(sid, serviceNameParam ?? locationState?.serviceName ?? serviceName);
    if (start) setSlot(start);
    if (resolvedPro !== null) setProfessional(resolvedPro || null, resolvedProName);
  }, [serviceId, serviceName, professionalName, professional, slotStart, params, setService, setSlot, setProfessional, serviceNameParam, locationState, proNameParam]);

  const toUserFacingError = (err: unknown) => {
    if (err instanceof ApiError) {
      const status = err.status;
      let detail = err.detail || err.message;
      if (!detail && err.rawBody) {
        try {
          const parsed = JSON.parse(err.rawBody);
          if (parsed && typeof parsed === 'object' && parsed.detail) detail = String(parsed.detail);
        } catch {
          detail = err.rawBody;
        }
      }

      if (detail) {
        if (/hora ocupada/i.test(detail) || /inicio no está disponible/i.test(detail)) {
          return 'Ese horario ya no está disponible. Elige otro hueco.';
        }
        if (/no ofrece ese servicio/i.test(detail)) {
          return 'Ese profesional no ofrece ese servicio. Prueba con otra persona.';
        }
        if (/service_id no existe/i.test(detail)) {
          return 'El servicio seleccionado ya no existe.';
        }
        if (/professional_id no existe/i.test(detail)) {
          return 'El profesional seleccionado ya no existe.';
        }
      }

      switch (status) {
        case 400:
          return detail || 'No pudimos crear la reserva. Revisa los datos e inténtalo de nuevo.';
        case 401:
          return 'Necesitas iniciar sesión o proporcionar la clave correcta para crear reservas.';
        case 403:
          return 'No tienes permisos para realizar esta acción.';
        case 404:
          return detail || 'No encontramos la información necesaria. Comprueba que la cita sigue disponible.';
        case 409:
          return 'Ese horario acaba de ocuparse. Elige otro hueco disponible.';
        case 422:
          return 'Los datos enviados no son válidos. Revisa la información del servicio y horario.';
        default:
          if (status >= 500) return 'El servidor tuvo un problema inesperado. Inténtalo de nuevo en unos minutos.';
          return detail || 'No pudimos crear la reserva. Inténtalo de nuevo.';
      }
    }
    if (err instanceof Error) return err.message;
    return 'Error creando la reserva';
  };

  const onConfirm = async () => {
    setLoading(true);
    setError(null);
    setOk(null);
    setReservationId(null);

    try {
      let result: Awaited<ReturnType<typeof api.createReservation>> | null = null;

      if (professionalId) {
        result = await api.createReservation({ service_id: serviceId, professional_id: professionalId, start: slotStart });
      } else {
        const candidates = pros.filter((p) => !p.services || p.services.includes(serviceId));
        if (candidates.length === 0) throw new Error('No hay profesionales disponibles para este servicio');

        let success = false;
        let lastError = '';
        for (const p of candidates) {
          try {
            result = await api.createReservation({ service_id: serviceId, professional_id: p.id, start: slotStart });
            setProfessional(p.id, p.name);
            if (slotStart) {
              setSlot(slotStart);
            }
            success = true;
            break;
          } catch (e: unknown) {
            lastError = e instanceof Error ? e.message : 'Error desconocido';
          }
        }
        if (!success) throw new Error(`No fue posible crear la reserva: ${lastError}`);
      }

      if (result) {
        setOk(result.message);
        setReservationId(result.reservation_id);
      }
      toast.success('Reserva confirmada');
    } catch (e: unknown) {
      const msg = toUserFacingError(e);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const goHome = useCallback(() => {
    reset();
    navigate('/');
  }, [navigate, reset]);

  const handleBack = useCallback(() => {
    navigate('/book/date', { state: buildBookingState(location) });
  }, [navigate, location]);

  const stepsStep = 3;

  if (!serviceId || !slotStart) {
    return (
      <BookingLayout step={stepsStep} title="Confirmar reserva" subtitle="Revisa los detalles antes de confirmar">
        <div className="mx-auto max-w-2xl rounded-2xl border border-amber-400/30 bg-amber-400/10 p-10 text-center shadow-soft">
          <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-full border border-amber-400/40 bg-amber-400/15">
            <Calendar className="h-10 w-10 text-amber-300" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Faltan datos de tu reserva</h2>
          <p className="mt-2 text-sm text-muted-foreground">Completa los pasos anteriores para continuar.</p>
          <Button variant="outline" className="mt-6" onClick={() => navigate('/book/date', { state: buildBookingState(location) })}>
            Ir a seleccionar servicio
          </Button>
        </div>
      </BookingLayout>
    );
  }

  return (
    <BookingLayout
      step={stepsStep}
      title="Confirmar reserva"
      subtitle="Revisa los detalles antes de confirmar tu cita"
      summary={`Servicio seleccionado: ${serviceLabel}`}
    >
      <Card className="mx-auto max-w-2xl rounded-2xl border border-border bg-card shadow-soft">
        <CardContent className="p-6 md:p-8">
          {summaryLoading ? (
            <div className="space-y-4" role="status" aria-live="polite">
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-24 rounded" />
                  <Skeleton className="h-4 w-48 rounded" />
                  <Skeleton className="h-3 w-40 rounded" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-28 rounded" />
                  <Skeleton className="h-4 w-40 rounded" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-32 rounded" />
                  <Skeleton className="h-4 w-44 rounded" />
                </div>
              </div>
            </div>
          ) : (
            <dl className="space-y-5">
              <div className="flex items-start gap-4">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand/10 text-brand">
                  <Scissors className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="space-y-1">
                  <dt className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Servicio</dt>
                  <dd className="text-lg font-semibold leading-6 text-foreground">{serviceLabel}</dd>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {service?.duration_min} min · {fmtEuro(service?.price_eur)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand/10 text-brand">
                  <User className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="space-y-1">
                  <dt className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Profesional</dt>
                  <dd className="text-lg font-semibold leading-6 text-foreground">{professionalLabel}</dd>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand/10 text-brand">
                  <Clock className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="space-y-1">
                  <dt className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Fecha y hora</dt>
                  <dd className="text-lg font-semibold leading-6 text-foreground">{formatDateTime(slotStart)}</dd>
                </div>
              </div>
            </dl>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="mx-auto mt-6 max-w-2xl rounded-2xl border border-red-500/40 bg-red-500/10 p-5" role="alert">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-red-300" aria-hidden="true" />
            <div className="space-y-1">
              <p className="font-semibold leading-6 text-red-200">No se pudo confirmar</p>
              <p className="text-sm leading-6 text-red-100">{error}</p>
            </div>
          </div>
        </div>
      )}

      {ok && (
        <div className="mx-auto mt-6 max-w-2xl rounded-2xl border border-brand/40 bg-brand/10 p-5" role="status" aria-live="polite">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-brand" aria-hidden="true" />
            <div className="space-y-1">
              <p className="font-semibold leading-6 text-brand">¡Reserva creada!</p>
              <p className="break-all text-sm leading-6 text-brand/80">{ok}</p>
              {reservationId && (
                <p className="text-xs text-brand/70" data-testid="reservation-id">
                  ID: {reservationId}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto mt-6 flex max-w-2xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        {ok ? (
          <>
            <Button
              onClick={() => {
                reset();
                navigate('/book/date', { state: buildBookingState(location) });
              }}
              className="w-full rounded-xl bg-brand px-5 py-2 text-black shadow-soft transition hover:brightness-110 sm:w-auto"
            >
              Crear otra reserva
            </Button>
            <Button
              variant="outline"
              onClick={goHome}
              className="w-full rounded-xl border-border bg-background px-5 py-2 text-foreground transition hover:border-brand/60 sm:w-auto"
            >
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" /> Volver al inicio
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={loading}
              className="w-full rounded-xl border-border bg-background px-5 py-2 text-foreground transition hover:border-brand/60 sm:w-auto"
            >
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" /> Volver
            </Button>
            <Button
              onClick={onConfirm}
              disabled={loading}
              className="w-full rounded-xl bg-brand px-5 py-2 text-black shadow-soft transition hover:brightness-110 disabled:pointer-events-none disabled:opacity-40 sm:w-auto"
            >
              {loading ? 'Confirmando…' : 'Confirmar reserva'}
            </Button>
          </>
        )}
      </div>
    </BookingLayout>
  );
};

export default BookConfirm;
