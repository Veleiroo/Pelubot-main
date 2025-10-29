import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageCircle, Clock, MapPin, Copy, Map } from "lucide-react"

export function ContactSection() {
  return (
    <section id="contacto" className="py-16 sm:py-20 md:py-24 lg:py-32 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 font-serif">Contacto & Ubicación</h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed px-4">
            Estamos aquí para ti. Reserva tu cita o visítanos en nuestro local. Tu nuevo look te está esperando.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 max-w-6xl mx-auto">
          <Card className="bg-card border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 flex flex-col">
            <CardHeader className="flex-none">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <MessageCircle className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Contáctanos</CardTitle>
              <p className="text-sm text-muted-foreground">Te respondemos lo antes posible</p>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">TELÉFONO</p>
                  <p className="font-semibold">+34 653 48 12 70</p>
                </div>
                <div className="h-px bg-border" />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">EMAIL</p>
                  <p className="font-semibold text-sm break-all">deinisbarbersclub@gmail.com</p>
                </div>
              </div>
              <Button className="w-full bg-[#25D366] hover:bg-[#20BA5A] text-white mt-4" asChild>
                <a href="https://wa.me/34653481270" target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  WhatsApp
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-card border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 flex flex-col">
            <CardHeader className="flex-none">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Horarios</CardTitle>
              <p className="text-sm text-muted-foreground">Hora local: 15:33:19</p>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col justify-center space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2">LUNES - VIERNES</p>
                <p className="font-semibold">9:30 - 13:30</p>
                <p className="font-semibold">16:30 - 20:30</p>
              </div>
              <div className="h-px bg-border" />
              <div>
                <p className="text-xs text-muted-foreground mb-2">SÁBADOS</p>
                <p className="font-semibold">9:00 - 14:00</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 flex flex-col">
            <CardHeader className="flex-none">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Cómo llegar</CardTitle>
              <p className="text-sm text-muted-foreground">Encuéntranos fácilmente</p>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col justify-between space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2">DIRECCIÓN</p>
                <p className="font-semibold">Calle de Juslibol, 46</p>
                <p className="text-sm text-muted-foreground">50015 Zaragoza</p>
              </div>
              <div className="flex flex-col gap-2 mt-4">
                <Button
                  variant="outline"
                  className="w-full border-primary/20 hover:bg-primary/10 bg-transparent"
                  size="sm"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar dirección
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-primary/20 hover:bg-primary/10 bg-transparent"
                  size="sm"
                  asChild
                >
                  <a
                    href="https://maps.google.com/?q=Calle+de+Juslibol+46+Zaragoza"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Map className="w-4 h-4 mr-2" />
                    Google Maps
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
