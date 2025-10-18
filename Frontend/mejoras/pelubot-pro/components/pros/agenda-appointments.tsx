"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, Mail, Phone, CalendarIcon, Trash2, Plus, Filter } from "lucide-react"

const appointments = [
  {
    time: "09:00 - 09:45",
    status: "CONFIRMADA",
    client: "Cliente 31",
    service: "Corte de cabello clásico",
    phone: "+34 600 000 000",
    email: "cliente31@pelubot.mock",
    serviceType: "corte",
  },
  {
    time: "11:30 - 12:15",
    status: "CONFIRMADA",
    client: "Cliente 32",
    service: "Arreglo de barba premium",
    phone: "+34 600 000 000",
    email: "cliente32@pelubot.mock",
    serviceType: "barba",
  },
  {
    time: "13:00 - 13:30",
    status: "PENDIENTE",
    client: "Cliente 33",
    service: "Corte y peinado",
    phone: "+34 600 000 001",
    email: "cliente33@pelubot.mock",
    serviceType: "corte",
  },
  {
    time: "15:00 - 15:45",
    status: "CONFIRMADA",
    client: "Cliente 34",
    service: "Tratamiento capilar",
    phone: "+34 600 000 002",
    email: "cliente34@pelubot.mock",
    serviceType: "tratamiento",
  },
  {
    time: "16:30 - 17:00",
    status: "PENDIENTE",
    client: "Cliente 35",
    service: "Corte básico",
    phone: "+34 600 000 003",
    email: "cliente35@pelubot.mock",
    serviceType: "corte",
  },
  {
    time: "18:00 - 18:45",
    status: "CONFIRMADA",
    client: "Cliente 36",
    service: "Coloración completa",
    phone: "+34 600 000 004",
    email: "cliente36@pelubot.mock",
    serviceType: "color",
  },
]

function getServiceTypeColor(serviceType: string) {
  switch (serviceType) {
    case "corte":
      return "border-l-accent"
    case "barba":
      return "border-l-blue-500"
    case "color":
      return "border-l-purple-500"
    case "tratamiento":
      return "border-l-green-500"
    default:
      return "border-l-border"
  }
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    CONFIRMADA: { color: "bg-accent", label: "Confirmada" },
    PENDIENTE: { color: "bg-yellow-500", label: "Pendiente" },
    CANCELADA: { color: "bg-destructive", label: "Cancelada" },
  }[status] || { color: "bg-muted-foreground", label: status }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border/50 transition-all hover:bg-secondary">
      <div className={`w-2 h-2 rounded-full ${config.color} animate-pulse`} />
      <span className="text-xs font-medium">{config.label}</span>
    </div>
  )
}

export function AgendaAppointments() {
  const [filter, setFilter] = useState<"all" | "confirmada" | "pendiente">("all")

  const filteredAppointments = appointments.filter((apt) => {
    if (filter === "all") return true
    return apt.status === filter.toUpperCase()
  })

  const confirmadasCount = appointments.filter((a) => a.status === "CONFIRMADA").length
  const pendientesCount = appointments.filter((a) => a.status === "PENDIENTE").length
  const canceladasCount = 0

  return (
    <div className="flex flex-col h-full gap-4">
      <Card className="p-5 bg-card border-border/50 flex-shrink-0 shadow-lg px-5">
        <div className="flex items-center justify-between mb-0">
          <div>
            <h2 className="text-2xl font-bold mb-1">Martes 14 De Octubre</h2>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="font-medium">{filteredAppointments.length} citas</span>
              <span>•</span>
              <span className="text-accent font-medium">{confirmadasCount} confirmadas</span>
              <span>•</span>
              <span className="text-yellow-500 font-medium">{pendientesCount} pendientes</span>
              {canceladasCount > 0 && (
                <>
                  <span>•</span>
                  <span className="text-destructive font-medium">{canceladasCount} canceladas</span>
                </>
              )}
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="bg-transparent hover:bg-secondary hover:scale-105 transition-all h-9 px-4"
          >
            <Plus className="w-4 h-4 mr-2" />
            Crear cita
          </Button>
        </div>

        <div className="flex items-center gap-2 leading-7">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={filter === "all" ? "default" : "outline"}
              onClick={() => setFilter("all")}
              className={
                filter === "all" ? "bg-accent hover:bg-accent/90 h-8" : "bg-transparent hover:bg-secondary h-8"
              }
            >
              Todas
            </Button>
            <Button
              size="sm"
              variant={filter === "confirmada" ? "default" : "outline"}
              onClick={() => setFilter("confirmada")}
              className={
                filter === "confirmada" ? "bg-accent hover:bg-accent/90 h-8" : "bg-transparent hover:bg-secondary h-8"
              }
            >
              Confirmadas
            </Button>
            <Button
              size="sm"
              variant={filter === "pendiente" ? "default" : "outline"}
              onClick={() => setFilter("pendiente")}
              className={
                filter === "pendiente" ? "bg-accent hover:bg-accent/90 h-8" : "bg-transparent hover:bg-secondary h-8"
              }
            >
              Pendientes
            </Button>
          </div>
        </div>
      </Card>

      <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        <div className="space-y-3">
          {filteredAppointments.map((apt, idx) => (
            <Card
              key={idx}
              className={`p-4 border-l-4 ${getServiceTypeColor(apt.serviceType)} bg-card border-r border-t border-b border-border/30 hover:bg-secondary/30 hover:shadow-lg transition-all duration-200 animate-in fade-in slide-in-from-left-2`}
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="flex items-start justify-between gap-4 mb-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm font-semibold text-muted-foreground">{apt.time}</span>
                  </div>
                  <h3 className="text-xl font-bold mb-1">{apt.client}</h3>
                  <p className="text-sm text-muted-foreground">{apt.service}</p>
                </div>
                <StatusBadge status={apt.status} />
              </div>

              <div className="flex items-center justify-between gap-6 border-t border-border/30 pt-0">
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2 hover:text-foreground transition-colors">
                    <Phone className="w-4 h-4" />
                    <span>{apt.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 hover:text-foreground transition-colors">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{apt.email}</span>
                  </div>
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-3 hover:bg-secondary hover:scale-105 transition-all"
                  >
                    <CalendarIcon className="w-3.5 h-3.5 mr-1.5" />
                    Reprogramar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-3 text-destructive hover:text-destructive hover:bg-destructive/10 hover:scale-105 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    Cancelar
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
