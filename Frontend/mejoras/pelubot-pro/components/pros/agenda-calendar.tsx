"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

const daysOfWeek = ["LU", "MA", "MI", "JU", "VI", "SÁ", "DO"]
const daysInMonth = Array.from({ length: 31 }, (_, i) => i + 1)

const daysWithAppointments = [6, 7, 9, 12, 14, 18, 20, 21, 25, 28]
const today = 14

export function AgendaCalendar() {
  const [selectedDay, setSelectedDay] = useState(14)
  const [showAppointmentDays, setShowAppointmentDays] = useState(true)

  const totalAppointments = daysWithAppointments.length * 3
  const upcomingDays = daysWithAppointments.filter((d) => d >= today).length

  return (
    <Card className="p-4 bg-card border-border/50 flex flex-col">
      <div className="mb-3">
        <h2 className="font-semibold text-center text-3xl mb-1">Calendario</h2>
        <p className="text-muted-foreground leading-relaxed text-center text-base">Selecciona un día para revisar o añadir citas.</p>
      </div>

      <div className="flex items-center justify-between mb-0">
        <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-secondary">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="font-semibold text-base">Octubre 2025</span>
        <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-secondary">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-0">
        {daysOfWeek.map((day) => (
          <div key={day} className="text-center text-xs text-muted-foreground font-medium py-1">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 mb-3 gap-3.5">
        {[29, 30].map((day) => (
          <button
            key={`prev-${day}`}
            className="flex flex-col items-center justify-center text-sm text-muted-foreground/30 hover:bg-secondary/50 rounded-lg transition-colors h-10 relative"
          >
            <span>{day}</span>
          </button>
        ))}
        {daysInMonth.map((day) => {
          const isSelected = day === selectedDay
          const isToday = day === today
          const hasAppointments = showAppointmentDays && daysWithAppointments.includes(day)

          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={cn(
                "flex flex-col items-center justify-center text-sm rounded-lg transition-all h-10 relative",
                isSelected
                  ? "bg-foreground text-background font-bold shadow-md"
                  : isToday
                    ? "ring-2 ring-accent ring-inset font-semibold hover:bg-secondary"
                    : "hover:bg-secondary",
              )}
            >
              <span>{day}</span>
              {hasAppointments && !isSelected && <div className="absolute bottom-1 w-1 h-1 rounded-full bg-accent" />}
            </button>
          )
        })}
        {[1, 2].map((day) => (
          <button
            key={`next-${day}`}
            className="flex flex-col items-center justify-center text-sm text-muted-foreground/30 hover:bg-secondary/50 rounded-lg transition-colors h-10 relative"
          >
            <span>{day}</span>
          </button>
        ))}
      </div>

      <div className="space-y-2 mb-3 pb-3 border-b border-border">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Citas este mes</span>
          <span className="font-semibold">{totalAppointments}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Días con citas</span>
          <span className="font-semibold">{daysWithAppointments.length}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Próximos días</span>
          <span className="font-semibold">{upcomingDays}</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="show-appointments" className="text-sm font-medium cursor-pointer">
          Días con citas
        </Label>
        <Switch id="show-appointments" checked={showAppointmentDays} onCheckedChange={setShowAppointmentDays} />
      </div>
    </Card>
  )
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ")
}
