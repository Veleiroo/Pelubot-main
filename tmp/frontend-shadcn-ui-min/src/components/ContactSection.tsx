import { useEffect, useState } from 'react';
import { MapPin, MessageCircle } from '@/lib/icons';
import { Button } from '@/components/ui/button';

export default function ContactSection() {
  const [now, setNow] = useState<Date>(() => new Date());
  const [copied, setCopied] = useState(false);
  const handleWhatsApp = () => {
    window.open('https://wa.me/34653481270?text=Hola%20Deinis%2C%20quiero%20reservar%20una%20cita.', '_blank', 'noreferrer');
  };
  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText('Calle de Juslibol, 46, 50015 Zaragoza');
      setCopied(true);
    } catch (error) {
      setCopied(true);
    }
  };

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    if (!copied) {
      return;
    }
    const resetId = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(resetId);
  }, [copied]);

  const hourAngle = ((now.getHours() % 12) + now.getMinutes() / 60) * 30;
  const minuteAngle = (now.getMinutes() + now.getSeconds() / 60) * 6;
  const secondAngle = now.getSeconds() * 6;
  const timeLabel = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const cardClass =
    'group relative flex h-full translate-y-0 flex-col rounded-2xl border border-white/10 bg-[#111111] px-7 py-7 shadow-[0_0_0_0_rgba(0,0,0,0)] transform transition-transform duration-300 will-change-transform hover:-translate-y-1 hover:border-brand/60 hover:shadow-[0_18px_45px_-20px_rgba(16,185,129,0.8),0_0_25px_-12px_rgba(16,185,129,0.65)]';
  const cardLayoutClass = 'w-full';
  const primaryButtonClass =
    'inline-flex w-full items-center justify-center gap-2 rounded-lg border border-brand bg-transparent px-5 py-3 text-sm font-semibold text-brand transition hover:bg-brand hover:text-black';
  const headingClass = 'text-xl font-semibold text-white';
  const helperClass = 'text-xs text-gray-400';
  const labelClass = 'text-xs font-medium uppercase tracking-[0.18em] text-white/70 subpixel-antialiased';
  const bodyClass = 'text-sm text-gray-300 subpixel-antialiased';
  const accentTextClass = 'text-sm font-medium text-white tabular-nums subpixel-antialiased';
  const headerContentClass = 'flex flex-col items-center gap-1 text-center min-h-[48px]';
  const cardContentClass = 'flex flex-1 flex-col items-center justify-start gap-6';

  return (
    <section id="contacto" className="py-20 bg-black">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            <span className="text-brand">Contacto</span> & Ubicación
          </h2>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto">
            Estamos aquí para ti. Reserva tu cita o visítanos en nuestro local. 
            Tu nuevo look te está esperando.
          </p>
        </div>

        <div className="grid justify-center gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,280px))]">
          <article className={`${cardClass} ${cardLayoutClass} text-center`}>
            <div className={cardContentClass}>
              <header className="flex flex-col items-center gap-3 text-center">
                <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-black/40">
                  <MessageCircle className="h-6 w-6 text-white/80" aria-hidden="true" />
                </div>
                <div className={headerContentClass}>
                  <h3 className={headingClass}>Contáctanos</h3>
                  <p className={helperClass}>Te respondemos lo antes posible</p>
                </div>
              </header>

              <div className="w-full space-y-4">
                <div className="space-y-1">
                  <p className={labelClass}>Teléfono</p>
                  <a href="tel:+34653481270" className={`block ${accentTextClass}`}>
                    +34 653 48 12 70
                  </a>
                </div>
                <div className="mx-auto h-px w-3/4 bg-white/15" />
                <div className="space-y-1">
                  <p className={labelClass}>Email</p>
                  <a href="mailto:deinisbarbersclub@gmail.com" className={`block ${accentTextClass}`}>
                    deinisbarbersclub@gmail.com
                  </a>
                </div>
              </div>
            </div>

            <div className="pt-6 w-full">
              <Button
                onClick={handleWhatsApp}
                className={`mx-auto ${primaryButtonClass}`}
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                WhatsApp
              </Button>
            </div>
          </article>

          <article className={`${cardClass} ${cardLayoutClass} items-center text-center`}>
            <header className="flex flex-col items-center gap-3 text-center">
              <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-black/40">
                <span
                  className="absolute left-1/2 top-1/2 h-4 w-[2px] -translate-x-1/2 bg-emerald-300"
                  style={{ transform: `translateY(-100%) rotate(${hourAngle}deg)`, transformOrigin: 'bottom center' }}
                />
                <span
                  className="absolute left-1/2 top-1/2 h-5 w-[1.5px] -translate-x-1/2 bg-gray-200"
                  style={{ transform: `translateY(-100%) rotate(${minuteAngle}deg)`, transformOrigin: 'bottom center' }}
                />
                <span
                  className="absolute left-1/2 top-1/2 h-5 w-px -translate-x-1/2 bg-emerald-400/80"
                  style={{ transform: `translateY(-100%) rotate(${secondAngle}deg)`, transformOrigin: 'bottom center' }}
                />
                <span className="absolute h-1 w-1 rounded-full bg-white/80" />
              </div>
              <div className={headerContentClass}>
                <h3 className={headingClass}>Horarios</h3>
                <p className={helperClass}>Hora local: {timeLabel}</p>
              </div>
            </header>

            <div className={`mt-6 w-full space-y-4 ${bodyClass}`}>
              <div className="space-y-1 text-center">
                <span className={labelClass}>Lunes - Viernes</span>
                <div className="flex flex-col items-center gap-0.5">
                  <span className={accentTextClass}>9:30 - 13:30</span>
                  <span className="text-brand" aria-hidden="true">
                    •
                  </span>
                  <span className={accentTextClass}>16:30 - 20:30</span>
                </div>
              </div>
              <div className="mx-auto h-px w-3/4 bg-white/15" />
              <div className="space-y-1 text-center">
                <span className={labelClass}>Sábados</span>
                <div className="flex flex-col items-center gap-0.5">
                  <span className={accentTextClass}>9:00 - 14:00</span>
                </div>
              </div>
            </div>
          </article>

          <article className={`${cardClass} ${cardLayoutClass} text-center`}>
            <div className={cardContentClass}>
              <header className="flex flex-col items-center gap-3 text-center">
                <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-black/40">
                  <MapPin className="h-6 w-6 text-white/80" aria-hidden="true" />
                </div>
                <div className={headerContentClass}>
                  <h3 className={headingClass}>Cómo llegar</h3>
                  <p className={helperClass}>Encuéntranos fácilmente</p>
                </div>
              </header>

              <div className={`w-full space-y-4 text-center ${bodyClass}`}>
                <div className="space-y-1">
                  <p className={labelClass}>Dirección</p>
                  <p className={accentTextClass}>Calle de Juslibol, 46</p>
                </div>
                <p className={helperClass}>50015 Zaragoza</p>
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={handleCopyAddress}
                    className={`inline-flex items-center justify-center rounded-full border border-white/15 px-3 py-1 text-xs font-medium text-gray-400 transition-colors hover:border-brand hover:text-brand ${copied ? 'border-brand text-brand' : ''}`}
                  >
                    {copied ? 'Dirección copiada' : 'Copiar dirección'}
                  </button>
                </div>
              </div>
            </div>

            <Button
              asChild
              className={`mt-auto mx-auto ${primaryButtonClass}`}
            >
              <a href="https://maps.app.goo.gl/m4rC6Huwn1BJPgDx7" target="_blank" rel="noreferrer">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                Google Maps
              </a>
            </Button>
          </article>
        </div>
      </div>
    </section>
  );
}
