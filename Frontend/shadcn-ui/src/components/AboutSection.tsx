import { Card, CardContent } from '@/components/ui/card';
import { Users, Star, Clock, Scissors } from '@/lib/icons';

const stats = [
  { icon: Users, value: '500+', label: 'Clientes satisfechos' },
  { icon: Star, value: '5★', label: 'Calificación promedio' },
  { icon: Clock, value: '7', label: 'Días a la semana' },
  { icon: Scissors, value: '100%', label: 'Profesional' },
];

export default function AboutSection() {
  return (
    <section id="sobre-nosotros" className="bg-background py-16 sm:py-20 md:py-24 lg:py-32">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 sm:gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="relative order-2 lg:order-1">
            <div className="relative mx-auto aspect-[3/4] max-w-md overflow-hidden rounded-2xl shadow-2xl lg:mx-0">
              <img src="/assets/gallery-1.jpg" alt="Barbero profesional en acción" className="h-full w-full object-cover" />
              <div className="absolute inset-x-6 bottom-6 rounded-lg border border-primary/40 bg-background/90 px-6 py-3 text-center shadow-lg backdrop-blur">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">+5 años de experiencia</p>
              </div>
            </div>
          </div>

          <div className="order-1 space-y-6 text-center lg:order-2 lg:space-y-8 lg:text-left">
            <div className="space-y-4">
              <span className="inline-flex items-center justify-center rounded-full bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-primary">
                Nuestra historia
              </span>
              <h2 className="text-3xl font-bold text-foreground sm:text-4xl md:text-5xl">
                Sobre <span className="text-primary">Nosotros</span>
              </h2>
              <div className="space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base md:text-lg">
                <p>
                  En Deinis Barber Club, combinamos la tradición de la barbería clásica con el estilo urbano contemporáneo.
                  Nuestro compromiso es ofrecer no solo un corte de cabello, sino una experiencia completa que refleje tu personalidad única.
                </p>
                <p>
                  Con años de experiencia y una pasión genuina por nuestro oficio, creamos looks que van desde lo clásico hasta lo más vanguardista,
                  siempre con la máxima atención al detalle.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:max-w-xl md:gap-6 lg:mx-0">
              {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <Card
                    key={stat.label}
                    className="border-border/60 bg-card/80 text-center shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 hover:shadow-lg"
                  >
                    <CardContent className="flex h-full flex-col items-center justify-center gap-1.5 px-5 py-6 sm:gap-2 sm:px-6">
                      <Icon className="h-6 w-6 text-primary sm:h-8 sm:w-8" />
                      <p className="text-2xl font-bold text-foreground sm:text-3xl">{stat.value}</p>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground sm:text-sm">{stat.label}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
