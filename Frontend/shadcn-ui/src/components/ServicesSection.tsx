import { Scissors, Sparkles, Crown, Brush } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCallback, type ReactNode } from 'react';
import { useBooking } from '@/store/booking';
import { loadBookDate, loadBookConfirm, loadBookService } from '@/lib/route-imports';
import { buildBookingState } from '@/lib/booking-route';

type MarketingService = {
  icon: ReactNode;
  title: string;
  description: string;
  price: string;
  features: string[];
  serviceId?: string;
};

export default function ServicesSection() {
  const navigate = useNavigate();
  const location = useLocation();
  const setService = useBooking((s) => s.setService);
  const services: MarketingService[] = [
    {
      icon: <Scissors className="text-brand" size={28} />,
      title: 'Corte de cabello',
      description: 'Un corte preciso y personalizado que se adapta a tu estilo del día a día.',
      price: '13 €',
      features: ['Lavado relajante', 'Peinado y acabado', 'Recomendaciones de estilo'],
      serviceId: 'corte_cabello',
    },
    {
      icon: <Sparkles className="text-brand" size={28} />,
      title: 'Corte + arreglo de barba',
      description: 'El combo ideal para salir impecable: cabello definido y barba perfectamente contorneada.',
      price: '18 €',
      features: ['Definición de contornos', 'Hidratación de barba', 'Styling final'],
      serviceId: 'corte_barba',
    },
    {
      icon: <Brush className="text-brand" size={28} />,
      title: 'Arreglo de barba',
      description: 'Perfilado y cuidado profesional para mantener tu barba con forma y textura.',
      price: '10 €',
      features: ['Afeitado con navaja', 'Aceites nutritivos', 'Toalla caliente'],
      serviceId: 'arreglo_barba',
    },
    {
      icon: <Crown className="text-brand" size={28} />,
      title: 'Corte de jubilado',
      description: 'Corte clásico con la misma dedicación de siempre, a un precio especial para jubilados.',
      price: '7 €',
      features: ['Atención prioritaria', 'Servicio detallado', 'Consejos de mantenimiento'],
      serviceId: 'corte_jubilado',
    },
  ];

  const handleReservation = useCallback((svc?: MarketingService) => {
    loadBookService();
    if (svc?.serviceId) {
      setService(svc.serviceId, svc.title);
      loadBookDate();
      loadBookConfirm();
      const params = new URLSearchParams({ service: svc.serviceId, service_name: svc.title });
      navigate(`/book/date?${params.toString()}`, { state: buildBookingState(location) });
      return;
    }
    loadBookDate();
    loadBookConfirm();
    navigate('/book/service', { state: buildBookingState(location) });
  }, [location, navigate, setService]);

  return (
    <section id="servicios" className="bg-black py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14 text-center">
          <h2 className="mb-4 text-4xl font-bold text-white md:text-5xl">
            Nuestros <span className="text-brand">Servicios</span>
          </h2>
          <p className="mx-auto max-w-2xl text-base text-gray-300 md:text-lg">
            Ofrecemos una gama completa de servicios profesionales para el cuidado masculino, desde cortes clásicos
            hasta tratamientos especializados.
          </p>
        </div>

        <div className="grid gap-6 md:gap-7 xl:gap-8 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
          {services.map((service, index) => (
            <article
              key={index}
              className="group relative flex h-full flex-col items-center rounded-xl border border-white/10 bg-[#111111] p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:border-white/70 hover:shadow-[0_18px_45px_-20px_rgba(255,255,255,0.35)]"
            >
              <div className="flex w-full items-center justify-center gap-3">
                <div className="rounded-lg border border-white/10 bg-black/70 p-2.5 transition-colors group-hover:border-white/70">
                  {service.icon}
                </div>
                <span className="text-2xl font-bold text-white sm:text-3xl">{service.price}</span>
              </div>

              <div className="mt-5 space-y-2 text-center">
                <h3 className="text-lg font-semibold text-white">{service.title}</h3>
                <p className="text-sm leading-relaxed text-gray-400">{service.description}</p>
              </div>

              <ul className="mt-4 space-y-1.5 text-sm text-gray-300">
                {service.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center justify-center gap-2 leading-relaxed">
                    <span className="inline-block size-1.5 rounded-full bg-white/80" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleReservation(service)}
                className="mt-6 inline-flex w-auto min-w-[160px] justify-center rounded-lg border border-brand bg-transparent px-6 py-2 text-sm font-semibold text-brand transition-colors hover:bg-brand hover:text-black"
              >
                Reservar ahora
              </Button>
            </article>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="mb-4 text-sm text-gray-400 md:text-base">¿No encuentras lo que buscas?</p>
          <Button
            onClick={() => handleReservation()}
            size="lg"
            className="bg-brand px-7 py-3 text-sm font-bold text-black transition-colors hover:bg-[#00B894] md:px-8 md:py-4 md:text-base"
          >
            Consulta Personalizada
          </Button>
        </div>
      </div>
    </section>
  );
}
