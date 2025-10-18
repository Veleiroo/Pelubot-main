import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const daysOfWeek = ['LU', 'MA', 'MI', 'JU', 'VI', 'SÁ', 'DO'];
const daysInMonth = Array.from({ length: 31 }, (_, index) => index + 1);

const daysWithAppointments = [6, 7, 9, 12, 14, 18, 20, 21, 25, 28];
const today = 14;

const cn = (...classes: string[]) => classes.filter(Boolean).join(' ');

export const AgendaCalendar = () => {
  const [selectedDay, setSelectedDay] = useState(14);
  const [showAppointmentDays, setShowAppointmentDays] = useState(true);

  const totalAppointments = daysWithAppointments.length * 3;
  const upcomingDays = daysWithAppointments.filter((day) => day >= today).length;

  return (
    <Card className="flex h-full flex-col border border-border/50 bg-card p-4 shadow-lg">
      <div className="mb-3 text-center">
        <h2 className="mb-1 text-3xl font-semibold text-foreground">Calendario</h2>
        <p className="text-base text-muted-foreground">Selecciona un día para revisar o añadir citas.</p>
      </div>

      <div className="mb-0 flex items-center justify-between">
        <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-secondary">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-base font-semibold text-foreground">Octubre 2025</span>
        <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-secondary">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="mb-0 grid grid-cols-7 gap-1">
        {daysOfWeek.map((day) => (
          <div key={day} className="py-1 text-center text-xs font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      <div className="mb-3 grid grid-cols-7 gap-3.5">
        {[29, 30].map((day) => (
          <button
            key={`prev-${day}`}
            className="relative flex h-10 flex-col items-center justify-center rounded-lg text-sm text-muted-foreground/30 transition-colors hover:bg-secondary/50"
            type="button"
          >
            <span>{day}</span>
          </button>
        ))}

        {daysInMonth.map((day) => {
          const isSelected = day === selectedDay;
          const isToday = day === today;
          const hasAppointments = showAppointmentDays && daysWithAppointments.includes(day);

          return (
            <button
              key={day}
              type="button"
              onClick={() => setSelectedDay(day)}
              className={cn(
                'relative flex h-10 flex-col items-center justify-center rounded-lg text-sm transition-all',
                isSelected
                  ? 'bg-foreground font-bold text-background shadow-md'
                  : isToday
                    ? 'font-semibold ring-2 ring-accent ring-inset hover:bg-secondary'
                    : 'hover:bg-secondary'
              )}
            >
              <span>{day}</span>
              {hasAppointments && !isSelected ? (
                <div className="absolute bottom-1 h-1 w-1 rounded-full bg-accent" />
              ) : null}
            </button>
          );
        })}

        {[1, 2].map((day) => (
          <button
            key={`next-${day}`}
            type="button"
            className="relative flex h-10 flex-col items-center justify-center rounded-lg text-sm text-muted-foreground/30 transition-colors hover:bg-secondary/50"
          >
            <span>{day}</span>
          </button>
        ))}
      </div>

      <div className="mb-3 space-y-2 border-b border-border pb-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Citas este mes</span>
          <span className="font-semibold text-foreground">{totalAppointments}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Días con citas</span>
          <span className="font-semibold text-foreground">{daysWithAppointments.length}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Próximos días</span>
          <span className="font-semibold text-foreground">{upcomingDays}</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="show-appointments" className="text-sm font-medium text-foreground">
          Días con citas
        </Label>
        <Switch id="show-appointments" checked={showAppointmentDays} onCheckedChange={setShowAppointmentDays} />
      </div>
    </Card>
  );
};

export default AgendaCalendar;
