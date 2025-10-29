import { Button } from '@/components/ui/button'
import { Calendar, Clock } from 'lucide-react'

export default function HeroSection() {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (!el) return
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth' })
  }

  return (
    <section id="inicio" className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20 pb-16">
      <div
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/professional-barber-tools-scissors-clippers-on-dar.jpg')" }}
      />
      <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/70 via-black/60 to-black/80" />

      <div className="container relative z-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 font-sans">
        <div className="flex flex-col items-center text-center space-y-8 md:space-y-12">
          <div className="space-y-4 md:space-y-6 w-full">
            <div className="space-y-2 md:space-y-3">
              <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold tracking-tighter leading-none">
                <span className="block text-primary font-serif italic">Deinis</span>
              </h1>
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-wide text-white">
                BARBER CLUB
              </h2>
            </div>

            <div className="w-24 sm:w-32 h-1 bg-primary mx-auto" />

            <p className="text-lg sm:text-xl md:text-2xl text-white/90 max-w-3xl mx-auto leading-relaxed font-light px-4">
              Donde el estilo urbano se encuentra con la tradición
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-stretch sm:items-center px-4">
            <Button
              size="lg"
              className="bg-primary text-black hover:bg-primary/90 font-bold text-base px-10 py-6 rounded-full transition-all hover:scale-105"
              asChild
            >
              <a
                href="#servicios"
                className="flex items-center justify-center whitespace-nowrap"
                onClick={(e) => {
                  e.preventDefault()
                  scrollTo('servicios')
                }}
              >
                <Calendar className="w-5 h-5 mr-2" />
                RESERVA TU CITA
              </a>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-white/30 hover:bg-white/10 hover:border-white/50 font-bold text-base px-10 py-6 rounded-full bg-transparent text-white transition-all hover:scale-105"
              asChild
            >
              <a
                href="#contacto"
                className="flex items-center justify-center whitespace-nowrap"
                onClick={(e) => {
                  e.preventDefault()
                  scrollTo('contacto')
                }}
              >
                <Clock className="w-5 h-5 mr-2" />
                VER HORARIOS
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
