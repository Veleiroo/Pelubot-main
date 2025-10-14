"use client"

import { Calendar, Clock, Mail, Phone, Plus, LogOut, CheckCircle2, XCircle, MoveRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useState } from "react"

export default function ResumenPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState<"resumen" | "agenda">("resumen")

  const todayAppointments = [
    {
      id: 1,
      time: "09:30",
      client: "Laura Pérez",
      service: "Corte y peinado",
      status: "confirmada",
    },
    {
      id: 2,
      time: "11:30",
      client: "Marta López",
      service: "Coloración parcial",
      status: "pendiente",
    },
    {
      id: 3,
      time: "13:30",
      client: "Andrea Vidal",
      service: "Tratamiento hidratante",
      status: "confirmada",
    },
    {
      id: 4,
      time: "15:30",
      client: "Sara Núñez",
      service: "Recogido evento",
      status: "cancelada",
    },
  ]

  const nextAppointment = {
    client: "Laura Pérez",
    time: "09:30 h",
    status: "Confirmada",
    service: "Corte y peinado",
    phone: "+34 612 345 678",
    lastVisit: "12/09/2025",
    notes: "Prefiere acabado con ondas suaves.",
  }

  const daySummary = {
    total: 4,
    confirmadas: 2,
    pendientes: 1,
    canceladas: 1,
  }

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmada":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20">
            confirmada
          </Badge>
        )
      case "pendiente":
        return <Badge className="bg-warning/15 text-warning border-warning/30 hover:bg-warning/20">pendiente</Badge>
      case "cancelada":
        return (
          <Badge className="bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/20">
            cancelada
          </Badge>
        )
      default:
        return null
    }
  }

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
              <Button
                variant="ghost"
                onClick={() => setCurrentPage("resumen")}
                className={
                  currentPage === "resumen"
                    ? "text-foreground font-medium bg-muted/50"
                    : "text-muted-foreground hover:text-foreground"
                }
              >
                Resumen
              </Button>
              <Button
                variant="ghost"
                onClick={() => setCurrentPage("agenda")}
                className={
                  currentPage === "agenda"
                    ? "text-foreground font-medium bg-muted/50"
                    : "text-muted-foreground hover:text-foreground"
                }
              >
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
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
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

      {currentPage === "resumen" ? (
        // Resumen Page Content
        <main className="container mx-auto px-6 py-8">
          <div className="grid lg:grid-cols-[1fr_380px] gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Next Appointment Card */}
              <Card className="p-6 bg-card border-border/50 hover:shadow-xl transition-all">
                <div className="space-y-5">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Próxima cita</p>
                      <h2 className="text-3xl font-semibold text-foreground">{nextAppointment.client}</h2>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="font-medium text-foreground">{nextAppointment.time}</span>
                        <span className="text-muted-foreground">•</span>
                        <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                          {nextAppointment.status}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <p className="text-foreground">{nextAppointment.service}</p>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{nextAppointment.phone}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Última visita: {nextAppointment.lastVisit}</span>
                    </div>

                    <div className="flex items-start gap-2 text-sm text-muted-foreground pt-1">
                      <svg
                        className="h-4 w-4 mt-0.5 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <span>{nextAppointment.notes}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-4 border-t border-border/50">
                    <Button className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground flex-1 sm:flex-none">
                      <CheckCircle2 className="h-4 w-4" />
                      Marcar como asistida
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10 hover:border-destructive/50 bg-transparent flex-1 sm:flex-none"
                    >
                      <XCircle className="h-4 w-4" />
                      No asistió
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2 border-border/50 hover:bg-muted hover:border-primary/50 bg-transparent flex-1 sm:flex-none"
                    >
                      <MoveRight className="h-4 w-4" />
                      Mover cita
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Today's Appointments */}
              <Card className="p-6 bg-card border-border/50">
                <div className="space-y-5">
                  <div>
                    <h3 className="text-2xl font-semibold text-foreground mb-1">Citas de hoy</h3>
                    <p className="text-sm text-muted-foreground">
                      Haz clic en cualquier reserva para ver más detalles (próximamente).
                    </p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    {todayAppointments.map((apt) => (
                      <button
                        key={apt.id}
                        className="p-4 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/50 hover:border-border transition-all text-left group"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-lg font-semibold text-foreground">{apt.time}</span>
                            {getStatusBadge(apt.status)}
                          </div>
                          <div>
                            <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                              {apt.client}
                            </p>
                            <p className="text-sm text-muted-foreground">{apt.service}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-border/50">
                    <p className="text-sm text-center text-muted-foreground">
                      No hay más citas previstas para hoy. ¡Disfruta el cierre del día!
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Right Column - Day Summary */}
            <div className="space-y-6">
              <Card className="p-6 bg-card border-border/50">
                <div className="space-y-5">
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-1">Resumen del día</h3>
                    <p className="text-sm text-muted-foreground">Una vista rápida de cómo va tu agenda hoy.</p>
                  </div>

                  <div className="space-y-4 pt-2">
                    <div className="text-center py-6 border-b border-border/50">
                      <p className="text-sm text-muted-foreground mb-2">Total de citas</p>
                      <p className="text-5xl font-bold text-foreground">{daySummary.total}</p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <span className="text-sm font-medium text-foreground">Confirmadas</span>
                        <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-base px-3 py-1">
                          {daySummary.confirmadas}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <span className="text-sm font-medium text-foreground">Pendientes</span>
                        <Badge className="bg-warning/15 text-warning border-warning/30 text-base px-3 py-1">
                          {daySummary.pendientes}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <span className="text-sm font-medium text-foreground">Canceladas</span>
                        <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-base px-3 py-1">
                          {daySummary.canceladas}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </main>
      ) : (
        // Agenda Page Content
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
                <Button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
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
      )}

      {/* Create Appointment Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[500px] bg-[#0f1729] border-[#1e293b] text-foreground">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Crear cita</DialogTitle>
            <p className="text-sm text-muted-foreground pt-1">Registra una nueva cita para el jueves 16 de octubre.</p>
          </DialogHeader>

          <div className="space-y-5 pt-4">
            {/* Service */}
            <div className="space-y-2">
              <Label htmlFor="service" className="text-sm font-medium">
                Servicio
              </Label>
              <Select defaultValue="corte-clasico">
                <SelectTrigger id="service" className="bg-[#0a0f1e] border-[#1e293b] text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0f1729] border-[#1e293b]">
                  <SelectItem value="corte-clasico">Corte de cabello clásico</SelectItem>
                  <SelectItem value="barba-premium">Arreglo de barba premium</SelectItem>
                  <SelectItem value="corte-barba">Corte + Barba</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Time and Name */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="time" className="text-sm font-medium">
                  Hora de inicio
                </Label>
                <Select defaultValue="10:00">
                  <SelectTrigger id="time" className="bg-[#0a0f1e] border-[#1e293b] text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0f1729] border-[#1e293b]">
                    <SelectItem value="09:00">09:00 h</SelectItem>
                    <SelectItem value="10:00">10:00 h</SelectItem>
                    <SelectItem value="11:00">11:00 h</SelectItem>
                    <SelectItem value="12:00">12:00 h</SelectItem>
                    <SelectItem value="13:00">13:00 h</SelectItem>
                    <SelectItem value="14:00">14:00 h</SelectItem>
                    <SelectItem value="15:00">15:00 h</SelectItem>
                    <SelectItem value="16:00">16:00 h</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Nombre de la persona
                </Label>
                <Input
                  id="name"
                  placeholder="Nombre y apellidos"
                  className="bg-[#0a0f1e] border-[#1e293b] text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {/* Phone and Email */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">
                  Teléfono de contacto
                </Label>
                <Input
                  id="phone"
                  placeholder="+34 600 000 000"
                  className="bg-[#0a0f1e] border-[#1e293b] text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Correo electrónico (opcional)
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="cliente@correo.com"
                  className="bg-[#0a0f1e] border-[#1e293b] text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-medium">
                Notas internas
              </Label>
              <Textarea
                id="notes"
                placeholder="Preferencias o recordatorios para el equipo"
                rows={3}
                className="bg-[#0a0f1e] border-[#1e293b] text-foreground placeholder:text-muted-foreground resize-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6">
            <Button
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
              className="border-[#1e293b] hover:bg-muted bg-transparent"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                // Handle save logic here
                setIsCreateModalOpen(false)
              }}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Guardar cita
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
