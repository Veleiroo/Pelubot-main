"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Calendar, Clock, User, Phone, Mail, Scissors, X } from "lucide-react"

interface NewAppointmentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewAppointmentModal({ open, onOpenChange }: NewAppointmentModalProps) {
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [selectedTime, setSelectedTime] = useState<string>("")
  const [selectedClient, setSelectedClient] = useState<string>("")
  const [selectedService, setSelectedService] = useState<string>("")

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

  const services = [
    { name: "Corte de cabello clásico", duration: "45 min" },
    { name: "Corte y peinado", duration: "60 min" },
    { name: "Coloración completa", duration: "120 min" },
    { name: "Coloración parcial", duration: "90 min" },
    { name: "Tratamiento hidratante", duration: "45 min" },
    { name: "Arreglo de barba premium", duration: "30 min" },
    { name: "Recogido evento", duration: "90 min" },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Nueva cita</DialogTitle>
          <DialogDescription>Completa los detalles para crear una nueva cita en tu agenda.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Client Selection */}
          <div className="space-y-2">
            <Label htmlFor="client" className="text-sm font-medium flex items-center gap-2">
              <User className="w-4 h-4" />
              Cliente
            </Label>
            <Input
              id="client"
              placeholder="Buscar cliente o añadir nuevo..."
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="bg-secondary/50 border-border"
            />
          </div>

          {/* Date Picker */}
          <div className="space-y-2">
            <Label htmlFor="date" className="text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Fecha
            </Label>
            <Input
              id="date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-secondary/50 border-border"
            />
          </div>

          {/* Time Slot Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Horario disponible
            </Label>
            <div className="grid grid-cols-6 gap-2">
              {availableSlots.map((slot) => (
                <Button
                  key={slot}
                  variant={selectedTime === slot ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTime(slot)}
                  className={
                    selectedTime === slot ? "bg-accent hover:bg-accent/90" : "bg-secondary/50 hover:bg-secondary"
                  }
                >
                  {slot}
                </Button>
              ))}
            </div>
          </div>

          {/* Service Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Scissors className="w-4 h-4" />
              Servicio
            </Label>
            <div className="space-y-2">
              {services.map((service) => (
                <Card
                  key={service.name}
                  className={cn(
                    "p-3 cursor-pointer transition-all hover:shadow-md",
                    selectedService === service.name
                      ? "bg-accent/20 border-accent"
                      : "bg-secondary/50 border-border hover:bg-secondary",
                  )}
                  onClick={() => setSelectedService(service.name)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{service.name}</span>
                    <span className="text-xs text-muted-foreground">{service.duration}</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Contact Info Display */}
          {selectedClient && (
            <Card className="p-4 bg-secondary/50 border-border">
              <h4 className="text-sm font-semibold mb-3">Información de contacto</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <span>+34 600 000 000</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <span>cliente@pelubot.mock</span>
                </div>
              </div>
            </Card>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Notas / Observaciones
            </Label>
            <Textarea
              id="notes"
              placeholder="Preferencias del cliente, detalles especiales..."
              className="bg-secondary/50 border-border min-h-[80px]"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
              disabled={!selectedClient || !selectedDate || !selectedTime || !selectedService}
            >
              Confirmar cita
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

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ")
}
