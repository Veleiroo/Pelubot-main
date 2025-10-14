import { Calendar, Clock, Mail, Phone, Plus, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"

export default function AgendaPage() {
  const appointments = [
    {
      id: 1,
      time: "09:00 - 09:45",
      client: "Cliente 34",
      service: "Corte de cabello clásico",
      phone: "+34 600 000 000",
      email: "cliente34@pelubot.mock",
      status: "pending",
    },
    {
      id: 2,
      time: "11:30 - 12:15",
      client: "Cliente 35",
      service: "Arreglo de barba premium",
      phone: "+34 600 000 000",
      email: "cliente35@pelubot.mock",
      status: "pending",
    },
  ]

  const daysOfWeek = ["LU", "MA", "MI", "JU", "VI", "SÁ", "DO"]
  const calendarDays = [
    { day: 29, isCurrentMonth: false },
    { day: 30, isCurrentMonth: false },
    { day: 1, isCurrentMonth: true },
    { day: 2, isCurrentMonth: true },
    { day: 3, isCurrentMonth: true },
    { day: 4, isCurrentMonth: true },
    { day: 5, isCurrentMonth: true },
    { day: 6, isCurrentMonth: true },
    { day: 7, isCurrentMonth: true },
    { day: 8, isCurrentMonth: true },
    { day: 9, isCurrentMonth: true },
    { day: 10, isCurrentMonth: true },
    { day: 11, isCurrentMonth: true },
    { day: 12, isCurrentMonth: true },
    { day: 13, isCurrentMonth: true },
    { day: 14, isCurrentMonth: true },
    { day: 15, isCurrentMonth: true },
    { day: 16, isCurrentMonth: true },
    { day: 17, isCurrentMonth: true, hasAppointments: true },
    { day: 18, isCurrentMonth: true },
    { day: 19, isCurrentMonth: true },
    { day: 20, isCurrentMonth: true },
    { day: 21, isCurrentMonth: true },
    { day: 22, isCurrentMonth: true },
    { day: 23, isCurrentMonth: true },
    { day: 24, isCurrentMonth: true },
    { day: 25, isCurrentMonth: true },
    { day: 26, isCurrentMonth: true },
    { day: 27, isCurrentMonth: true },
    { day: 28, isCurrentMonth: true },
    { day: 29, isCurrentMonth: true },
    { day: 30, isCurrentMonth: true },
    { day: 31, isCurrentMonth: true },
    { day: 1, isCurrentMonth: false },
    { day: 2, isCurrentMonth: false },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="text-xl font-semibold text-foreground">PELUBOT PRO</div>
              <span className="text-sm text-muted-foreground">— MARINA</span>
            </div>

            <nav className="hidden md:flex items-center gap-1">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                Resumen
              </Button>
              <Button variant="ghost" className="text-foreground font-medium bg-muted/50">
                Agenda
              </Button>
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                Clientes
              </Button>
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                Estadísticas
              </Button>
            </nav>

            <div className="flex items-center gap-3">
              <Button className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
                <Plus className="h-4 w-4" />
                Nueva cita
              </Button>
              <Button variant="outline" size="icon" className="border-border/50 hover:bg-muted bg-transparent">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-[400px_1fr] gap-8">
          {/* Calendar Sidebar */}
          <div className="space-y-6">
            <Card className="p-6 bg-card border-border/50">
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold text-foreground mb-2">Calendario</h2>
                  <p className="text-sm text-muted-foreground">Selecciona un día para revisar o añadir citas.</p>
                </div>

                {/* Month Navigation */}
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="icon">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </Button>
                  <div className="text-base font-medium">Octubre 2025</div>
                  <Button variant="ghost" size="icon">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Button>
                </div>

                {/* Calendar Grid */}
                <div className="space-y-2">
                  <div className="grid grid-cols-7 gap-1">
                    {daysOfWeek.map((day) => (
                      <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((day, index) => (
                      <button
                        key={index}
                        className={`
                          aspect-square rounded-lg text-sm font-medium transition-all relative
                          ${
                            !day.isCurrentMonth
                              ? "text-muted-foreground/30 hover:text-muted-foreground/50"
                              : day.hasAppointments
                                ? "bg-primary text-primary-foreground hover:bg-primary/80 shadow-lg shadow-primary/20"
                                : "text-foreground hover:bg-muted/50"
                          }
                        `}
                      >
                        {day.day}
                        {day.hasAppointments && (
                          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary-foreground" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Days with appointments toggle */}
                <div className="flex items-center justify-between pt-4 border-t border-border/50">
                  <label htmlFor="appointments-toggle" className="text-sm font-medium text-foreground cursor-pointer">
                    Días con citas
                  </label>
                  <Switch id="appointments-toggle" defaultChecked />
                </div>
              </div>
            </Card>
          </div>

          {/* Appointments List */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-semibold text-foreground mb-2">Viernes 17 de octubre</h1>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-foreground font-medium">{appointments.length} citas</span>
                  <Badge variant="secondary" className="gap-1.5 bg-muted text-foreground">
                    <Clock className="h-3 w-3" />2
                  </Badge>
                </div>
              </div>
              <Button className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
                <Plus className="h-4 w-4" />
                Crear cita
              </Button>
            </div>

            {/* Appointments */}
            <div className="space-y-4">
              {appointments.map((appointment) => (
                <Card
                  key={appointment.id}
                  className="p-6 border-l-4 border-l-warning bg-card border-border/50 hover:shadow-xl hover:shadow-warning/5 transition-all hover:border-border"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {appointment.time}
                          </div>
                          <Badge variant="outline" className="bg-warning/15 text-warning border-warning/30">
                            PENDIENTE
                          </Badge>
                        </div>

                        <div>
                          <h3 className="text-xl font-semibold text-foreground mb-1">{appointment.client}</h3>
                          <p className="text-muted-foreground">{appointment.service}</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            {appointment.phone}
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            {appointment.email}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 border-border/50 hover:bg-muted hover:border-primary/50 bg-transparent"
                        >
                          <Calendar className="h-4 w-4" />
                          Reprog.
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 text-destructive hover:text-destructive border-border/50 hover:bg-destructive/10 hover:border-destructive/50 bg-transparent"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                          Cancel.
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
