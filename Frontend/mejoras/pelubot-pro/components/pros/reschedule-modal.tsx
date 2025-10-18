"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Calendar, Clock, ArrowRight, Bell, X } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

interface RescheduleModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  appointment?: {
    client: string
    date: string
    time: string
    service: string
  }
}

export function RescheduleModal({ open, onOpenChange, appointment }: RescheduleModalProps) {
  const [newDate, setNewDate] = useState<string>("")
  const [newTime, setNewTime] = useState<string>("")
  const [notifyClient, setNotifyClient] = useState(true)

  const availableSlots = [
    "09:00",
    "09:30",
    "10:00",
    "10:30",
    "11:00",
    "11:30",
    "12:00",
    "12:30",
    "13:00",
    "13:30",
    "14:00",
    "14:30",
    "15:00",
    "15:30",
    "16:00",
    "16:30",
    "17:00",
    "17:30",
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Reprogramar cita</DialogTitle>
          <DialogDescription>Selecciona una nueva fecha y hora para la cita.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Current Appointment Reference */}
          <Card className="p-4 bg-secondary/30 border-border/50">
            <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Cita actual</h4>
            <div className="space-y-2">
              <p className="font-semibold text-lg">{appointment?.client}</p>
              <p className="text-sm text-muted-foreground">{appointment?.service}</p>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>{appointment?.date}</span>
                <span>•</span>
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>{appointment?.time}</span>
              </div>
            </div>
          </Card>

          {/* Visual Comparison */}
          <div className="flex items-center justify-center gap-4 py-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">De:</p>
              <p className="font-semibold">{appointment?.date}</p>
              <p className="text-sm text-muted-foreground">{appointment?.time}</p>
            </div>
            <ArrowRight className="w-6 h-6 text-accent" />
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">A:</p>
              <p className="font-semibold">{newDate || "Seleccionar"}</p>
              <p className="text-sm text-muted-foreground">{newTime || "Seleccionar"}</p>
            </div>
          </div>

          {/* New Date Selection */}
          <div className="space-y-2">
            <Label htmlFor="new-date" className="text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Nueva fecha
            </Label>
            <Input
              id="new-date"
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="bg-secondary/50 border-border"
            />
          </div>

          {/* New Time Slot Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Nuevo horario
            </Label>
            <div className="grid grid-cols-6 gap-2">
              {availableSlots.map((slot) => (
                <Button
                  key={slot}
                  variant={newTime === slot ? "default" : "outline"}
                  size="sm"
                  onClick={() => setNewTime(slot)}
                  className={newTime === slot ? "bg-accent hover:bg-accent/90" : "bg-secondary/50 hover:bg-secondary"}
                >
                  {slot}
                </Button>
              ))}
            </div>
          </div>

          {/* Notify Client Option */}
          <div className="flex items-center space-x-2 p-4 rounded-lg bg-secondary/50 border border-border">
            <Checkbox
              id="notify"
              checked={notifyClient}
              onCheckedChange={(checked) => setNotifyClient(checked as boolean)}
            />
            <Label
              htmlFor="notify"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2 cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              Notificar al cliente del cambio
            </Label>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
              disabled={!newDate || !newTime}
            >
              Confirmar cambio
            </Button>
            <Button
              variant="outline"
              className="bg-transparent hover:bg-secondary border-border"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
