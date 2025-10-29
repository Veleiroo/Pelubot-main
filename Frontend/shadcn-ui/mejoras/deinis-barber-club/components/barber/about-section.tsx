import { Users, Star, Clock, Scissors } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const stats = [
  {
    icon: Users,
    value: "500+",
    label: "Clientes Satisfechos",
  },
  {
    icon: Star,
    value: "5★",
    label: "Calificación Promedio",
  },
  {
    icon: Clock,
    value: "7",
    label: "Días a la Semana",
  },
  {
    icon: Scissors,
    value: "100%",
    label: "Profesional",
  },
]

export function AboutSection() {
  return (
    <section id="sobre-nosotros" className="py-16 sm:py-20 md:py-24 lg:py-32 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="grid lg:grid-cols-2 gap-8 sm:gap-10 md:gap-12 lg:gap-16 items-center">
          <div className="relative order-2 lg:order-1">
            <div className="relative rounded-2xl overflow-hidden aspect-[3/4] max-w-md mx-auto lg:mx-0 shadow-2xl">
              <img
                src="/modern-barbershop-haircut.png"
                alt="Barbero profesional trabajando"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-6 left-6 bg-background/90 backdrop-blur-sm px-6 py-3 rounded-lg border border-primary/30 shadow-lg">
                <p className="text-sm font-semibold text-primary">+5 Años de Experiencia</p>
              </div>
            </div>
          </div>

          <div className="space-y-6 sm:space-y-8 text-center lg:text-left order-1 lg:order-2">
            <div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 font-serif">Sobre Nosotros</h2>
              <div className="space-y-4 text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed">
                <p>
                  En Deinis Barber Club, combinamos la tradición de la barbería clásica con el estilo urbano
                  contemporáneo. Nuestro compromiso es ofrecer no solo un corte de cabello, sino una experiencia
                  completa que refleje tu personalidad única.
                </p>
                <p>
                  Con años de experiencia y una pasión genuina por nuestro oficio, creamos looks que van desde lo
                  clásico hasta lo más vanguardista, siempre con la máxima atención al detalle.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 max-w-lg mx-auto lg:mx-0">
              {stats.map((stat, index) => {
                const Icon = stat.icon
                return (
                  <Card
                    key={index}
                    className="bg-card border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10"
                  >
                    <CardContent className="p-4 sm:p-6 flex flex-col items-center justify-center text-center h-full">
                      <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-primary mb-2 sm:mb-3" />
                      <p className="text-2xl sm:text-3xl font-bold mb-1">{stat.value}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">{stat.label}</p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
