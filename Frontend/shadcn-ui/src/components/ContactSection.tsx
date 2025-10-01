import { useEffect, useState } from 'react';
import { MapPin, Phone, Mail, MessageCircle } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { loadBookDate, loadBookConfirm, loadBookService } from '@/lib/route-imports';
import { buildBookingState } from '@/lib/booking-route';

export default function ContactSection() {
  const [now, setNow] = useState<Date>(() => new Date());
  const navigate = useNavigate();
  const location = useLocation();
  const handleWhatsApp = () => {
    window.open('https://wa.me/34653481270?text=Hola%20Deinis%2C%20quiero%20reservar%20una%20cita.', '_blank', 'noreferrer');
  };

  const handleEmail = () => {
    window.open('mailto:info@deinisbarberclub.com', '_self');
  };

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const hourAngle = ((now.getHours() % 12) + now.getMinutes() / 60) * 30;
  const minuteAngle = (now.getMinutes() + now.getSeconds() / 60) * 6;
  const secondAngle = now.getSeconds() * 6;
  const timeLabel = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const cardClass =
    'group relative flex flex-col rounded-2xl border border-white/10 bg-[#111111]/95 p-6 shadow-[0_0_0_0_rgba(0,0,0,0)] transition-all duration-300 hover:-translate-y-1 hover:border-brand/60 hover:bg-[#111111] hover:shadow-[0_18px_45px_-20px_rgba(16,185,129,0.8),0_0_25px_-12px_rgba(16,185,129,0.65)]';

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

        <div className="grid justify-items-center gap-6 md:grid-cols-2 xl:grid-cols-3">
          <article className={`${cardClass} text-center`}>
            <div className="flex flex-1 flex-col items-center justify-center gap-6">
              <header className="flex flex-col items-center gap-3 text-center">
                <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-black/40">
                  <MessageCircle className="h-6 w-6 text-white/80" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">Contáctanos</h3>
                  <p className="text-xs text-gray-500">Te respondemos lo antes posible</p>
                </div>
              </header>

              <div className="w-full space-y-4 text-sm text-gray-300">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Teléfono</p>
                  <a href="tel:+34653481270" className="block text-base font-semibold text-white transition hover:text-brand">+34 653 48 12 70</a>
                </div>
                <div className="mx-auto h-px w-3/4 bg-white/15" />
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Email</p>
                  <a href="mailto:deinisbarbersclub@gmail.com" className="block text-sm text-gray-200 transition hover:text-brand">deinisbarbersclub@gmail.com</a>
                </div>
              </div>
            </div>

            <div className="pt-6 w-full">
              <Button
                onClick={handleWhatsApp}
                className="mx-auto inline-flex w-[240px] justify-center rounded-lg border border-brand bg-transparent px-5 py-2.5 text-sm font-semibold text-brand transition hover:bg-brand hover:text-black"
              >
                <MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                WhatsApp
              </Button>
            </div>
          </article>

          <article className={`${cardClass} items-center text-center`}>
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
              <div>
                <h3 className="text-xl font-semibold text-white">Horarios</h3>
                <p className="text-xs text-gray-500">Hora local: {timeLabel}</p>
              </div>
            </header>

            <div className="mt-6 space-y-5 text-sm text-gray-300">
              <div className="flex flex-col items-center gap-2 text-center">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Lunes - Viernes</span>
                <div className="flex flex-wrap items-center justify-center gap-6 text-base font-semibold text-white">
                  <span className="transition-colors hover:text-brand">9:30 - 13:30</span>
                  <span className="transition-colors hover:text-brand">16:30 - 20:30</span>
                </div>
              </div>
              <div className="mx-auto h-px w-3/4 bg-white/15" />
              <div className="flex flex-col items-center gap-2 text-center">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Sábados</span>
                <span className="text-base font-semibold text-white transition-colors hover:text-brand">9:00 - 14:00</span>
              </div>
            </div>
          </article>

          <article className={`${cardClass} text-center`}>
            <div className="flex flex-1 flex-col items-center justify-center gap-6">
              <header className="flex flex-col items-center gap-3 text-center">
                <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-black/40">
                  <MapPin className="h-6 w-6 text-white/80" aria-hidden="true" />
                </div>
                <h3 className="text-xl font-semibold text-white">Cómo llegar</h3>
              </header>

              <div className="space-y-2 text-center text-sm text-gray-300">
                <p className="text-lg font-semibold text-white">Calle de Juslibol, 46</p>
                <p className="text-xs text-gray-500">50015 Zaragoza</p>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText('Calle de Juslibol, 46, 50015 Zaragoza').catch(() => {});
                  }}
                  className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-gray-300 transition-colors hover:border-brand hover:bg-brand/10 hover:text-brand"
                >
                  Copiar dirección
                </button>
              </div>
            </div>

            <Button
              asChild
              className="mt-auto inline-flex w-[240px] justify-center rounded-lg border border-brand bg-transparent px-5 py-2.5 text-sm font-semibold text-brand transition hover:bg-brand hover:text-black mx-auto"
            >
              <a href="https://maps.app.goo.gl/m4rC6Huwn1BJPgDx7" target="_blank" rel="noreferrer">
                Ver en Google Maps
              </a>
            </Button>
          </article>
        </div>
      </div>
    </section>
  );
}
