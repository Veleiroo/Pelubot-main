import { useEffect, useMemo, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useBooking } from '@/store/booking';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api, ApiError } from '@/lib/api';
import { toast } from '@/components/ui/sonner';
import { BookingLayout } from '@/components/BookingLayout';
import { fmtEuro, fmtDateLong, fmtTime } from '@/lib/format';
import { CheckCircle2, Calendar, User, Scissors, ArrowLeft } from '@/lib/icons';
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
    customerName,
    customerPhone,
    notes,
    setCustomerName,
    setCustomerPhone,
    setNotes,
  } = useBooking();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [services, setServices] = useState<{ id: string; name: string; duration_min: number; price_eur: number }[]>([]);
  const [pros, setPros] = useState<{ id: string; name: string; services?: string[] }[]>([]);
  const [catalogReady, setCatalogReady] = useState(false);
  const [formErrors, setFormErrors] = useState<{ name?: string; phone?: string }>({});

  const trimmedName = useMemo(() => customerName.trim(), [customerName]);
  const trimmedPhone = useMemo(() => customerPhone.trim(), [customerPhone]);
  const phoneDigits = useMemo(() => trimmedPhone.replace(/\D+/g, ''), [trimmedPhone]);
  const trimmedNotes = useMemo(() => (notes ?? '').trim(), [notes]);
  const nameValid = trimmedName.length >= 2;
  const phoneValid = phoneDigits.length >= 6;
  const contactReady = nameValid && phoneValid;

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
  const professionalLabel = 'Deinis';
  const durationText = service?.duration_min != null ? `${service.duration_min} min` : 'Duración por confirmar';
  const priceText = service?.price_eur != null ? fmtEuro(service.price_eur) : 'Precio a confirmar';
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
        if (/tel[eé]fono.*contacto/i.test(detail)) {
          return 'Necesitamos un teléfono de contacto para confirmar la cita.';
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
          return detail || 'Los datos enviados no son válidos. Revisa la información del servicio y horario.';
        default:
          if (status >= 500) return 'El servidor tuvo un problema inesperado. Inténtalo de nuevo en unos minutos.';
          return detail || 'No pudimos crear la reserva. Inténtalo de nuevo.';
      }
    }
    if (err instanceof Error) return err.message;
    return 'Error creando la reserva';
  };

  const onConfirm = async () => {
    setError(null);
    setOk(null);
    setReservationId(null);

    const errors: { name?: string; phone?: string } = {};
    if (!nameValid) errors.name = 'Introduce un nombre con al menos 2 caracteres.';
    if (!phoneValid) errors.phone = 'Introduce un teléfono de contacto válido.';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error('Completa los datos de contacto para confirmar la reserva.');
      return;
    }

    setFormErrors({});
    setCustomerName(trimmedName);
    setCustomerPhone(trimmedPhone);
    setNotes(trimmedNotes ? trimmedNotes : null);

    setLoading(true);

    try {
      const basePayload = {
        service_id: serviceId,
        start: slotStart,
        customer_name: trimmedName,
        customer_phone: trimmedPhone,
        ...(trimmedNotes ? { notes: trimmedNotes } : {}),
      };

      let result: Awaited<ReturnType<typeof api.createReservation>> | null = null;

      if (professionalId) {
        result = await api.createReservation({ ...basePayload, professional_id: professionalId });
      } else {
        const candidates = pros.filter((p) => !p.services || p.services.includes(serviceId));
        if (candidates.length === 0) throw new Error('No hay profesionales disponibles para este servicio');

        let success = false;
        let lastError = '';
        for (const p of candidates) {
          try {
            result = await api.createReservation({ ...basePayload, professional_id: p.id });
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

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  if (!serviceId || !slotStart) {
    return (
      <BookingLayout className="rounded-[28px] bg-background px-5 py-5 shadow-[0_50px_120px_-65px_rgba(0,0,0,0.85)] md:px-7 md:py-6">
        <div className="mx-auto max-w-2xl rounded-2xl border border-amber-400/30 bg-amber-400/10 p-10 text-center shadow-soft">
          <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-full border border-amber-400/40 bg-amber-400/15">
            <Calendar className="h-10 w-10 text-amber-300" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Faltan datos de tu reserva</h2>
          <p className="mt-2 text-sm text-muted-foreground">Completa los pasos anteriores para continuar.</p>
          <Button variant="outline" className="mt-6" onClick={() => navigate('/book/service', { state: buildBookingState(location) })}>
            Ir a seleccionar servicio
          </Button>
        </div>
      </BookingLayout>
    );
  }

  const actionsDisabled = loading || !contactReady;
  const contactHint = !contactReady && !ok
    ? 'Completa los campos obligatorios para habilitar la confirmación de la reserva.'
    : null;

  return (
    <BookingLayout className="rounded-[28px] bg-background px-5 py-5 shadow-[0_50px_120px_-65px_rgba(0,0,0,0.85)] md:px-7 md:py-6">
      <div className="relative mx-auto flex w-full flex-col gap-4">
        <div className="rounded-3xl bg-background shadow-[0_35px_90px_-55px_rgba(0,0,0,0.7)]">
          <div className="px-4 pb-4 pt-3 md:px-6 md:pb-5 md:pt-4">
            <div className="flex flex-col gap-3">
              <section className="rounded-2xl border border-white/10 bg-background px-5 py-4 md:px-6 md:py-5">
                <header className="space-y-1 text-left">
                  <h3 className="text-base font-semibold uppercase tracking-wide text-white/80">Datos de contacto</h3>
                  <p className="text-xs text-white/55 md:text-sm">
                    Por favor indícanos tu nombre y un teléfono para confirmar la cita o avisarte de cambios.
                  </p>
                </header>

                <div className="mt-2 grid gap-3 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="customer-name" className="text-xs font-semibold uppercase tracking-wide text-white/70">
                      Nombre completo <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="customer-name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      autoComplete="name"
                      aria-invalid={!nameValid || Boolean(formErrors.name)}
                      aria-describedby={formErrors.name ? 'customer-name-error' : undefined}
                      required
                      className="h-11 rounded-xl border-white/15 bg-background px-4 text-sm text-white placeholder:text-white/35 focus:border-white/40 focus:ring-white/40"
                    />
                    {formErrors.name && (
                      <p id="customer-name-error" className="text-xs text-red-300">{formErrors.name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customer-phone" className="text-xs font-semibold uppercase tracking-wide text-white/70">
                      Teléfono <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="customer-phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="Ej. 600 123 456"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      aria-invalid={!phoneValid || Boolean(formErrors.phone)}
                      aria-describedby={formErrors.phone ? 'customer-phone-error' : undefined}
                      required
                      className="h-11 rounded-xl border-white/15 bg-background px-4 text-sm text-white placeholder:text-white/35 focus:border-white/40 focus:ring-white/40"
                    />
                    {formErrors.phone && (
                      <p id="customer-phone-error" className="text-xs text-red-300">{formErrors.phone}</p>
                    )}
                  </div>

                  <div className="space-y-2 md:col-span-3">
                    <Label htmlFor="customer-notes" className="text-xs font-semibold uppercase tracking-wide text-white/70">Notas para la barbería</Label>
                    <Textarea
                      id="customer-notes"
                      rows={3}
                      value={notes ?? ''}
                      onChange={(e) => setNotes(e.target.value ? e.target.value : null)}
                      placeholder="Opcional: ¿algo que debamos saber?"
                      className="min-h-[68px] rounded-xl border-white/15 bg-background px-4 py-3 text-sm text-white placeholder:text-white/35 focus:border-white/40 focus:ring-white/40"
                    />
                  </div>
                </div>
              </section>

              <aside className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-background px-5 py-4 md:px-6 md:py-5">
                <div className="space-y-1 text-left">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-white/80">Resumen de la cita</h4>
                  <p className="text-xs text-white/60">Confirma que todos los detalles son correctos antes de enviar.</p>
                </div>

                {summaryLoading ? (
                  <div className="space-y-3" role="status" aria-live="polite">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="flex items-center gap-4 rounded-xl border border-white/10 bg-background p-4">
                        <Skeleton className="h-10 w-10 rounded-xl" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-28 rounded" />
                          <Skeleton className="h-3 w-24 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-start gap-4 rounded-xl border border-white/10 bg-background p-4">
                      <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/5 text-white">
                        <Scissors className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-xs font-medium uppercase tracking-wide text-white/50">Servicio</p>
                        <p className="text-base font-semibold text-white">{serviceLabel}</p>
                        <p className="text-sm text-white/70">{durationText} · {priceText}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 rounded-xl border border-white/10 bg-background p-4">
                      <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/5 text-white">
                        <User className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-xs font-medium uppercase tracking-wide text-white/50">Profesional</p>
                        <p className="text-base font-semibold text-white">{professionalLabel}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 rounded-xl border border-white/10 bg-background p-4">
                      <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/5 text-white">
                        <Calendar className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-xs font-medium uppercase tracking-wide text-white/50">Fecha y hora</p>
                        <p className="text-base font-semibold text-white">{formatDateTime(slotStart)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {!summaryLoading && (
                  <div className="rounded-xl border border-white/10 bg-background px-4 py-3 text-xs text-white/70">
                    <p className="font-medium uppercase tracking-wide text-white/80">Recuerda</p>
                    <p className="mt-1">Si necesitas hacer cambios, contáctanos por teléfono o WhatsApp.</p>
                  </div>
                )}
              </aside>
            </div>

            {error && (
              <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4" role="alert">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-red-300" aria-hidden="true" />
                  <div className="space-y-1">
                    <p className="font-semibold text-red-200">No se pudo confirmar</p>
                    <p className="text-sm text-red-100">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {ok && (
              <div className="mt-5 rounded-xl border border-white/12 bg-background px-4 py-3" role="status" aria-live="polite">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-white" aria-hidden="true" />
                  <div className="space-y-1">
                    <p className="font-semibold text-white">¡Reserva creada!</p>
                    <p className="text-sm text-white/70">
                      Gracias por reservar con nosotros. Te confirmaremos los detalles por teléfono en breve.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-col gap-3 border-t border-white/10 bg-background px-4 py-3 md:flex-row md:items-center md:justify-between md:px-6 rounded-b-3xl">
              {contactHint && !ok && (
                <p className="text-xs text-white/60 md:max-w-sm" role="status" aria-live="polite">
                  {contactHint}
                </p>
              )}

              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
                {ok ? (
                  <>
                    <Button
                      onClick={() => {
                        reset();
                        navigate('/', { replace: true });
                      }}
                      className="h-10 rounded-xl border border-white/30 bg-white/10 px-5 text-white transition hover:bg-white/15"
                    >
                      Ver servicios
                    </Button>
                    <Button
                      variant="outline"
                      onClick={goHome}
                      className="h-10 rounded-xl border-white/15 bg-background px-5 text-white transition hover:border-white/35 hover:bg-white/5"
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
                      className="h-10 rounded-xl border-white/15 bg-background px-5 text-white transition hover:border-white/35 hover:bg-white/5 disabled:opacity-40"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" /> Volver
                    </Button>
                    <Button
                      onClick={onConfirm}
                      disabled={actionsDisabled}
                      aria-disabled={actionsDisabled}
                      className="h-10 rounded-xl border border-white/30 bg-white/10 px-5 text-white transition hover:bg-white/15 disabled:pointer-events-none disabled:opacity-40"
                    >
                      {loading ? 'Confirmando…' : 'Confirmar reserva'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </BookingLayout>
  );
};

export default BookConfirm;
