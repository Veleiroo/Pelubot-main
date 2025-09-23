  // Pasos para el indicador de progreso en Confirm
  const steps = [
    { key: 'service', label: 'Servicio', done: !!serviceId },
    { key: 'date', label: 'Fecha y hora', done: !!slotStart },
    { key: 'confirm', label: 'Confirmar', active: true },
  ];

  if (!serviceId || !slotStart) {
    return (
      <>
          <BookingSteps steps={steps} />
          <BookingSection title="Confirmar reserva" subtitle="Revisa los detalles antes de confirmar">
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-amber-500/20 to-amber-400/20 border border-amber-500/30 mb-6">
                <Calendar className="h-10 w-10 text-amber-400" />
              </div>
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-white">Faltan datos de tu reserva</h3>
                <p className="text-slate-400">Necesitas completar los pasos anteriores</p>
                <Button
                  variant="secondary"
                  onClick={() => navigate('/book/service')}
                  className="bg-gradient-to-r from-emerald-500/20 to-emerald-400/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30"
                >
                  Ir a seleccionar servicio
                </Button>
              </div>
            </div>
          </BookingSection>
      </>
    );
  }

  return (
    <>
        <BookingSteps steps={steps} />
        <BookingSection title="Confirmar reserva" subtitle="Revisa los detalles y confirma tu cita">
      <Card className="rounded-2xl border border-[var(--border)] bg-[var(--card)] backdrop-blur shadow-lg shadow-black/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Resumen</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-emerald-400 font-medium">
              <Scissors className="h-4 w-4" />
              <span>Servicio</span>
            </div>
            <div className="text-lg font-medium text-foreground">{serviceLabel}</div>
            <div className="text-sm text-muted-foreground">{service?.duration_min} min · {fmtEuro(service?.price_eur)}</div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-emerald-400 font-medium">
              <User className="h-4 w-4" />
              <span>Profesional</span>
            </div>
            <div className="text-lg font-medium text-foreground">{professionalLabel}</div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <div className="flex items-center gap-2 text-sm text-emerald-400 font-medium">
              <Calendar className="h-4 w-4" />
              <span>Fecha y hora</span>
            </div>
            <div className="flex items-center gap-2 text-lg font-medium text-foreground">
              <Clock className="h-5 w-5 text-emerald-400" />
              <span>{formatDateTime(slotStart)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-red-400 mt-0.5" />
            <div>
              <div className="text-red-400 font-semibold">Error al crear la reserva</div>
              <div className="text-red-300 text-sm mt-1">{error}</div>
            </div>
          </div>
        </div>
      )}

      {ok && (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5" />
            <div>
              <div className="text-emerald-400 font-semibold">¡Reserva creada!</div>
              <div className="text-emerald-300 text-sm mt-1 break-all">{ok}</div>
              {reservationId && (
                <div className="text-emerald-300 text-xs mt-2" data-testid="reservation-id">ID: {reservationId}</div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
        {ok ? (
          <>
            <Button
              onClick={() => {
                reset();
                navigate('/book/service');
              }}
              className="h-11 px-6 bg-accent text-accent-foreground hover:bg-emerald-400 transition-colors duration-150"
            >
              Crear otra reserva
            </Button>
            <Button
              variant="secondary"
              onClick={goHome}
              className="h-11 px-6"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al inicio
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="secondary"
              onClick={handleBack}
              disabled={loading}
              className="h-11 px-6"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            <Button
              onClick={onConfirm}
              disabled={loading}
              className="h-11 px-6 bg-accent text-accent-foreground hover:bg-emerald-400 disabled:opacity-50 disabled:pointer-events-none transition-colors duration-150"
            >
              {loading ? 'Creando reserva…' : 'Confirmar reserva'}
            </Button>
          </>
        )}
      </div>
      </BookingSection>
    </>
  );
}

export default BookConfirm;
