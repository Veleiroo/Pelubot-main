import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isToday, isSameDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Appointment } from '../../shared/types';

const daysOfWeek = ['LU', 'MA', 'MI', 'JU', 'VI', 'SÁ', 'DO'];

interface AgendaCalendarProps {
  appointments: Appointment[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

export function AgendaCalendar({ appointments, selectedDate, onSelectDate }: AgendaCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(selectedDate);
  const [showAppointmentDays, setShowAppointmentDays] = useState(true);

  // Calculate days to show in calendar
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get days from previous month to fill the first week
  const startDayOfWeek = (getDay(monthStart) + 6) % 7; // Convert Sunday=0 to Monday=0
  const prevMonthDays = startDayOfWeek > 0 
    ? eachDayOfInterval({ 
        start: subMonths(monthStart, 1), 
        end: subMonths(monthStart, 1) 
      }).slice(-startDayOfWeek)
    : [];

  // Get days from next month to fill the last week
  const endDayOfWeek = (getDay(monthEnd) + 6) % 7;
  const nextMonthDays = endDayOfWeek < 6
    ? eachDayOfInterval({
        start: addMonths(monthEnd, 1),
        end: addMonths(monthEnd, 1)
      }).slice(0, 6 - endDayOfWeek)
    : [];

  // Get set of dates that have appointments
  const datesWithAppointments = useMemo(() => {
    const dates = new Set<string>();
    appointments.forEach((apt) => {
      dates.add(apt.date);
    });
    return dates;
  }, [appointments]);

  // Calculate stats for current month
  const monthStats = useMemo(() => {
    const monthStr = format(currentMonth, 'yyyy-MM');
    const monthAppointments = appointments.filter((apt) => apt.date.startsWith(monthStr));
    const daysWithAppts = new Set(monthAppointments.map((apt) => apt.date)).size;
    const today = new Date();
    const upcomingDays = Array.from(new Set(monthAppointments.map((apt) => apt.date)))
      .filter((dateStr) => parseISO(dateStr) >= today)
      .length;

    return {
      totalAppointments: monthAppointments.length,
      daysWithAppointments: daysWithAppts,
      upcomingDays,
    };
  }, [appointments, currentMonth]);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const renderDay = (day: Date, isCurrentMonth: boolean) => {
    const isSelected = isSameDay(day, selectedDate);
    const isTodayDate = isToday(day);
    const dateStr = format(day, 'yyyy-MM-dd');
    const hasAppointments = showAppointmentDays && datesWithAppointments.has(dateStr);

    return (
      <button
        key={day.toISOString()}
        onClick={() => isCurrentMonth && onSelectDate(day)}
        disabled={!isCurrentMonth}
        className={cn(
          'flex flex-col items-center justify-center text-sm rounded-lg transition-all h-10 relative',
          isCurrentMonth
            ? isSelected
              ? 'bg-foreground text-background font-bold shadow-md'
              : isTodayDate
                ? 'ring-2 ring-accent ring-inset font-semibold hover:bg-secondary'
                : 'hover:bg-secondary'
            : 'text-muted-foreground/30 hover:bg-secondary/50'
        )}
      >
        <span>{format(day, 'd')}</span>
        {hasAppointments && !isSelected && isCurrentMonth && (
          <div className="absolute bottom-1 w-1 h-1 rounded-full bg-accent" />
        )}
      </button>
    );
  };

  return (
    <Card className="p-4 bg-card border-border/50 flex flex-col">
      <div className="mb-3">
        <h2 className="font-semibold text-center text-3xl mb-1">Calendario</h2>
        <p className="text-muted-foreground leading-relaxed text-center text-base">
          Selecciona un día para revisar o añadir citas.
        </p>
      </div>

      <div className="flex items-center justify-between mb-0">
        <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-secondary" onClick={handlePrevMonth}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="font-semibold text-base capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: es })}
        </span>
        <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-secondary" onClick={handleNextMonth}>
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
        {prevMonthDays.map((day) => renderDay(day, false))}
        {monthDays.map((day) => renderDay(day, true))}
        {nextMonthDays.map((day) => renderDay(day, false))}
      </div>

      <div className="space-y-2 mb-3 pb-3 border-b border-border">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Citas este mes</span>
          <span className="font-semibold">{monthStats.totalAppointments}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Días con citas</span>
          <span className="font-semibold">{monthStats.daysWithAppointments}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Próximos días</span>
          <span className="font-semibold">{monthStats.upcomingDays}</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="show-appointments" className="text-sm font-medium cursor-pointer">
          Días con citas
        </Label>
        <Switch id="show-appointments" checked={showAppointmentDays} onCheckedChange={setShowAppointmentDays} />
      </div>
    </Card>
  );
}
