import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Calendar, Clock, Phone, CheckCircle2, XCircle, CalendarClock } from "lucide-react"

export function AppointmentCard() {
  return (
    <Card className="p-4 bg-card border-border/50">
      <div className="mb-4">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Próxima cita</p>
        <h2 className="text-2xl font-bold mb-2">Laura Pérez</h2>
        <div className="flex items-center gap-2 text-sm mb-2">
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="font-semibold">09:30 h</span>
          <span>•</span>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent/20 border border-accent/30">
            <div className="w-1.5 h-1.5 rounded-full bg-accent" />
            <span className="text-xs font-medium text-accent">Confirmada</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-3">Corte y peinado</p>
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5" />
            <span>+34 612 345 678</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" />
            <span>Última visita: 12/09/2025</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3 italic border-l-2 border-border pl-2">
          Prefiere acabado con ondas suaves.
        </p>
      </div>

      <div className="flex gap-2">
        <Button size="sm" className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground h-8 text-xs">
          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
          Asistida
        </Button>
        <Button size="sm" variant="outline" className="flex-1 h-8 text-xs bg-transparent">
          <XCircle className="w-3.5 h-3.5 mr-1" />
          No asistió
        </Button>
        <Button size="sm" variant="outline" className="h-8 text-xs bg-transparent">
          <CalendarClock className="w-3.5 h-3.5 mr-1" />
          Mover
        </Button>
      </div>
    </Card>
  )
}
