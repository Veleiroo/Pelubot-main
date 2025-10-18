"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, Plus } from "lucide-react"

const appointments = [
  {
    time: "09:30",
    client: "Laura Pérez",
    service: "Corte y peinado",
    status: "confirmada",
    period: "morning",
  },
  {
    time: "11:30",
    client: "Marta López",
    service: "Coloración parcial",
    status: "pendiente",
    period: "morning",
  },
  {
    time: "13:30",
    client: "Andrea Vidal",
    service: "Tratamiento hidratante",
    status: "confirmada",
    period: "afternoon",
  },
  {
    time: "15:30",
    client: "Sara Núñez",
    service: "Recogido evento",
    status: "cancelada",
    period: "afternoon",
  },
]

const statusConfig = {
  confirmada: { label: "Confirmada", dotColor: "bg-accent", textColor: "text-accent" },
  pendiente: { label: "Pendiente", dotColor: "bg-yellow-500", textColor: "text-yellow-500" },
  cancelada: { label: "Cancelada", dotColor: "bg-destructive", textColor: "text-destructive" },
}

interface TodayAppointmentsProps {
  onNewAppointment: () => void
}

export function TodayAppointments({ onNewAppointment }: TodayAppointmentsProps) {
  const confirmedCount = appointments.filter((a) => a.status === "confirmada").length
  const pendingCount = appointments.filter((a) => a.status === "pendiente").length
  const canceledCount = appointments.filter((a) => a.status === "cancelada").length

  return (
    <Card className="p-4 bg-card border-border/50 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold mb-1">Citas de hoy</h2>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{appointments.length} citas</span>
            <span>•</span>
            <span className="text-accent">{confirmedCount} confirmadas</span>
            <span>•</span>
            <span className="text-yellow-500">{pendingCount} pendientes</span>
          </div>
        </div>
        <Button size="sm" onClick={onNewAppointment} className="h-8 text-xs">
          <Plus className="w-3.5 h-3.5 mr-1" />
          Crear cita
        </Button>
      </div>

      <div className="space-y-3 flex-1 overflow-y-auto">
        {appointments.map((apt, idx) => {
          const config = statusConfig[apt.status as keyof typeof statusConfig]
          return (
            <div
              key={idx}
              className="p-3 bg-secondary/30 hover:bg-secondary/50 transition-all duration-200 cursor-pointer border border-border/30 animate-in fade-in slide-in-from-left-2"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground">{apt.time}</span>
                  </div>
                  <h3 className="text-base font-bold mb-0.5">{apt.client}</h3>
                  <p className="text-xs text-muted-foreground">{apt.service}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={cn("w-1.5 h-1.5 rounded-full", config.dotColor)} />
                  <span className={cn("text-xs font-medium", config.textColor)}>{config.label}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ")
}
