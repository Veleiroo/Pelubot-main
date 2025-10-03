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
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

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
    customerEmail,
    notes,
    setCustomerName,
    setCustomerPhone,
    setCustomerEmail,
    setNotes,
  } = useBooking();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [services, setServices] = useState<{ id: string; name: string; duration_min: number; price_eur: number }[]>([]);
  const [pros, setPros] = useState<{ id: string; name: string; services?: string[] }[]>([]);
  const [catalogReady, setCatalogReady] = useState(false);
  const [formErrors, setFormErrors] = useState<{ name?: string; phone?: string; email?: string }>({});

  const trimmedName = useMemo(() => customerName.trim(), [customerName]);
  const trimmedPhone = useMemo(() => customerPhone.trim(), [customerPhone]);
  const phoneDigits = useMemo(() => trimmedPhone.replace(/\D+/g, ''), [trimmedPhone]);
  const trimmedEmail = useMemo(() => (customerEmail ?? '').trim(), [customerEmail]);
  const trimmedNotes = useMemo(() => (notes ?? '').trim(), [notes]);
  const nameValid = trimmedName.length >= 2;
  const phoneValid = phoneDigits.length >= 6;
  const emailValid = trimmedEmail === '' || EMAIL_REGEX.test(trimmedEmail);
  const contactReady = nameValid && phoneValid && emailValid;

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

    const errors: { name?: string; phone?: string; email?: string } = {};
    if (!nameValid) errors.name = 'Introduce un nombre con al menos 2 caracteres.';
    if (!phoneValid) errors.phone = 'Introduce un teléfono de contacto válido.';
    if (!emailValid) errors.email = 'Introduce un correo electrónico válido o deja el campo vacío.';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error('Completa los datos de contacto para confirmar la reserva.');
      return;
    }

    setFormErrors({});
    setCustomerName(trimmedName);
    setCustomerPhone(trimmedPhone);
    setCustomerEmail(trimmedEmail ? trimmedEmail : null);
    setNotes(trimmedNotes ? trimmedNotes : null);

    setLoading(true);

    try {
      const basePayload = {
        service_id: serviceId,
        start: slotStart,
        customer_name: trimmedName,
        customer_phone: trimmedPhone,
        ...(trimmedEmail ? { customer_email: trimmedEmail } : {}),
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
      <BookingLayout title="Confirmar reserva" subtitle="Revisa los detalles antes de confirmar">
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
    <BookingLayout
      title="Confirmar reserva"
      subtitle="Revisa los detalles antes de confirmar tu cita"
      summary={`Servicio seleccionado: ${serviceLabel}`}
    >
      <div className="mx-auto w-full max-w-[960px]">
        <div className="relative rounded-3xl border border-zinc-800/70 bg-zinc-900/85 shadow-[0_40px_120px_-60px_rgba(0,0,0,0.8)]">
          <div className="px-5 pb-8 pt-8 md:px-8 md:pb-10 md:pt-10">
            <div className="space-y-2 text-center">
              <h3 className="text-xl font-semibold text-white md:text-2xl">Revisa y confirma tu reserva</h3>
              <p className="text-sm text-zinc-400">Comprueba los detalles y completa tus datos de contacto para finalizar.</p>
            </div>

            <div className="mt-8 grid gap-8 lg:grid-cols-[1.65fr,1fr]">
              <section className="space-y-6 rounded-2xl border border-zinc-800/80 bg-zinc-900/65 p-6">
                <header className="space-y-1 text-left">
                  <h3 className="text-lg font-semibold text-white md:text-xl">Datos de contacto</h3>
                  <p className="text-sm text-zinc-400">Necesitamos un nombre y un teléfono por si debemos avisarte de cambios.</p>
                </header>

                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="customer-name" className="text-sm font-medium text-zinc-200">
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
                    />
                    {formErrors.name && (
                      <p id="customer-name-error" className="text-xs text-red-300">{formErrors.name}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="customer-phone" className="text-sm font-medium text-zinc-200">
                      Teléfono <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="customer-phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="Ej. +34 600 123 456"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      aria-invalid={!phoneValid || Boolean(formErrors.phone)}
                      aria-describedby={formErrors.phone ? 'customer-phone-error' : undefined}
                      required
                    />
                    {formErrors.phone && (
                      <p id="customer-phone-error" className="text-xs text-red-300">{formErrors.phone}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="customer-email" className="text-sm font-medium text-zinc-200">Correo electrónico</Label>
                    <Input
                      id="customer-email"
                      type="email"
                      autoComplete="email"
                      value={customerEmail ?? ''}
                      onChange={(e) => setCustomerEmail(e.target.value ? e.target.value : null)}
                      aria-invalid={!emailValid || Boolean(formErrors.email)}
                      aria-describedby={formErrors.email ? 'customer-email-error' : 'customer-email-helper'}
                      placeholder="Opcional"
                    />
                    {formErrors.email ? (
                      <p id="customer-email-error" className="text-xs text-red-300">{formErrors.email}</p>
                    ) : (
                      <p id="customer-email-helper" className="text-xs text-zinc-500">Te avisaremos también por email si lo facilitas.</p>
                    )}
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="customer-notes" className="text-sm font-medium text-zinc-200">Notas para la barbería</Label>
                    <Textarea
                      id="customer-notes"
                      rows={3}
                      value={notes ?? ''}
                      onChange={(e) => setNotes(e.target.value ? e.target.value : null)}
                      placeholder="Opcional: ¿algo que debamos saber?"
                    />
                    <p className="text-xs text-zinc-500">Ejemplo: alergias, preferencias, si vienes acompañado, etc.</p>
                  </div>
                </div>
              </section>

              <aside className="flex flex-col gap-5 rounded-2xl border border-emerald-500/25 bg-zinc-900/70 p-6">
                <div className="space-y-1 text-left">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-emerald-200">Resumen de la cita</h4>
                  <p className="text-xs text-emerald-100/70">Confirma que todos los detalles son correctos antes de enviar.</p>
                </div>

                {summaryLoading ? (
                  <div className="space-y-4" role="status" aria-live="polite">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="flex items-center gap-4 rounded-xl border border-zinc-800/70 bg-zinc-900/80 p-4">
                        <Skeleton className="h-10 w-10 rounded-xl" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-28 rounded" />
                          <Skeleton className="h-3 w-24 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-start gap-4 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4">
                      <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-500/15 text-emerald-200">
                        <Scissors className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-xs font-medium uppercase tracking-wide text-emerald-200/80">Servicio</p>
                        <p className="text-base font-semibold text-white">{serviceLabel}</p>
                        <p className="text-sm text-emerald-100/75">{service?.duration_min} min · {fmtEuro(service?.price_eur)}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 rounded-xl border border-zinc-800/70 bg-zinc-900/80 p-4">
                      <div className="grid h-11 w-11 place-items-center rounded-xl bg-zinc-800/80 text-emerald-200">
                        <User className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-xs font-medium uppercase tracking-wide text-white/50">Profesional</p>
                        <p className="text-base font-semibold text-white">{professionalLabel}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 rounded-xl border border-zinc-800/70 bg-zinc-900/80 p-4">
                      <div className="grid h-11 w-11 place-items-center rounded-xl bg-zinc-800/80 text-emerald-200">
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
                  <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-4 py-3 text-xs text-emerald-200">
                    <p className="font-medium uppercase tracking-wide">Recuerda</p>
                    <p className="mt-1 text-emerald-100/80">
                      Podrás modificar o cancelar tu cita respondiendo al correo de confirmación.
                    </p>
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
              <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4" role="status" aria-live="polite">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" aria-hidden="true" />
                  <div className="space-y-1">
                    <p className="font-semibold text-emerald-200">¡Reserva creada!</p>
                    <p className="break-all text-sm text-emerald-100">{ok}</p>
                    {reservationId && (
                      <p className="text-xs text-emerald-200/80" data-testid="reservation-id">
                        ID: {reservationId}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="sticky bottom-0 mt-8 -mx-5 flex flex-col gap-4 border-t border-zinc-800/70 bg-zinc-900/85 px-5 py-5 backdrop-blur-sm md:-mx-8 md:flex-row md:items-center md:justify-between md:px-8 rounded-b-3xl">
              {contactHint && !ok && (
                <p className="text-xs text-zinc-400 md:max-w-sm" role="status" aria-live="polite">
                  {contactHint}
                </p>
              )}

              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
                {ok ? (
                  <>
                    <Button
                      onClick={() => {
                        reset();
                        navigate('/book/service', { state: buildBookingState(location) });
                      }}
                      className="h-10 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-5 text-emerald-200 transition hover:bg-emerald-500/20"
                    >
                      Crear otra reserva
                    </Button>
                    <Button
                      variant="outline"
                      onClick={goHome}
                      className="h-10 rounded-xl border-zinc-700 bg-zinc-900 px-5 text-zinc-100 transition hover:border-emerald-400/60"
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
                      className="h-10 rounded-xl border-zinc-700 bg-zinc-900 px-5 text-zinc-100 transition hover:border-emerald-400/60 disabled:opacity-40"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" /> Volver
                    </Button>
                    <Button
                      onClick={onConfirm}
                      disabled={actionsDisabled}
                      aria-disabled={actionsDisabled}
                      className="h-10 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-5 text-emerald-200 shadow-soft transition hover:bg-emerald-500/25 disabled:pointer-events-none disabled:opacity-40"
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
