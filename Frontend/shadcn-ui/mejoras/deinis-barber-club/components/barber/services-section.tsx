import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Scissors, Sparkles, Radar as Razor, Crown } from "lucide-react"

const services = [
  {
    icon: Scissors,
    title: "Corte de cabello",
    price: "13 €",
    description: "Un corte preciso y personalizado que se adapta a tu estilo del día a día.",
    features: ["Lavado relajante", "Peinado y acabado", "Recomendaciones de estilo"],
  },
  {
    icon: Sparkles,
    title: "Corte + arreglo de barba",
    price: "18 €",
    description: "El combo ideal para salir impecable: cabello definido y barba perfectamente contorneada.",
    features: ["Definición de contornos", "Aceites nutritivos", "Hidratación de barba", "Styling final"],
  },
  {
    icon: Razor,
    title: "Arreglo de barba",
    price: "10 €",
    description: "Perfilado y cuidado profesional para mantener tu barba con forma y textura.",
    features: ["Afeitado con navaja", "Aceites nutritivos", "Toalla caliente"],
  },
  {
    icon: Crown,
    title: "Corte de jubilado",
    price: "7 €",
    description: "Corte clásico con la misma dedicación de siempre, a un precio especial para jubilados.",
    features: ["Atención prioritaria", "Servicio detallado", "Consejos de mantenimiento"],
  },
]

export function ServicesSection() {
  return (
    <section id="servicios" className="py-16 sm:py-20 md:py-24 lg:py-32 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 font-serif">Nuestros Servicios</h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed px-4">
            Ofrecemos una gama completa de servicios profesionales para el cuidado masculino, desde cortes clásicos
            hasta tratamientos especializados.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {services.map((service, index) => {
            const Icon = service.icon
            return (
              <Card
                key={index}
                className="bg-card border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 group flex flex-col"
              >
                <CardHeader className="flex-none">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <span className="text-2xl font-bold text-primary">{service.price}</span>
                  </div>
                  <CardTitle className="text-xl mb-2">{service.title}</CardTitle>
                  <CardDescription className="text-muted-foreground leading-relaxed">
                    {service.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow flex items-center">
                  <ul className="space-y-2 w-full">
                    {service.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="flex-none">
                  <Button
                    variant="outline"
                    className="w-full border-primary/20 hover:bg-primary hover:text-primary-foreground bg-transparent"
                    asChild
                  >
                    <a href="#contacto">Reservar ahora</a>
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
