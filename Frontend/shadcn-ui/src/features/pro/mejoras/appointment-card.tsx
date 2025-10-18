import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Calendar, CalendarClock, CheckCircle2, Clock, Phone, XCircle } from 'lucide-react';

export const AppointmentCard = () => {
  return (
    <Card className="border-border/50 bg-card p-4 shadow-lg">
      <div className="mb-4">
        <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">Próxima cita</p>
        <h2 className="mb-2 text-2xl font-bold text-foreground">Laura Pérez</h2>
        <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span className="font-semibold text-foreground">09:30 h</span>
          <span>•</span>
          <div className="flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/20 px-2 py-0.5">
            <div className="h-1.5 w-1.5 rounded-full bg-accent" />
            <span className="text-xs font-medium text-accent">Confirmada</span>
          </div>
        </div>
        <p className="mb-3 text-sm text-muted-foreground">Corte y peinado</p>
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5" />
            <span>+34 612 345 678</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5" />
            <span>Última visita: 12/09/2025</span>
          </div>
        </div>
        <p className="mt-3 border-l-2 border-border pl-2 text-xs italic text-muted-foreground">
          Prefiere acabado con ondas suaves.
        </p>
      </div>

      <div className="flex gap-2">
        <Button size="sm" className="flex-1 h-8 bg-accent text-accent-foreground hover:bg-accent/90 text-xs">
          <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
          Asistida
        </Button>
        <Button size="sm" variant="outline" className="flex-1 h-8 bg-transparent text-xs">
          <XCircle className="mr-1 h-3.5 w-3.5" />
          No asistió
        </Button>
        <Button size="sm" variant="outline" className="h-8 bg-transparent text-xs">
          <CalendarClock className="mr-1 h-3.5 w-3.5" />
          Mover
        </Button>
      </div>
    </Card>
  );
};

export default AppointmentCard;
