import { forwardRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

import type { AgendaCalendarCardProps } from '../types';

type LegendItemProps = {
  indicatorClassName: string;
  label: string;
};

const legendItems: LegendItemProps[] = [
  {
    indicatorClassName: 'bg-gradient-to-br from-emerald-400 to-emerald-500 shadow-[0_0_12px_rgba(52,211,153,0.8)]',
    label: 'Días con citas',
  },
];

export const CalendarCard = forwardRef<HTMLDivElement, AgendaCalendarCardProps>(
  (
    {
      selectedDate,
      currentMonth,
      today,
      busyDates,
      fromMonth,
      toMonth,
      title = 'Calendario',
      description,
      disablePrev,
      disableNext,
      onSelectDay,
      onMonthChange,
      onPrev,
      onNext,
    },
    ref
  ) => {
    const startOfToday = today ? new Date(today.getFullYear(), today.getMonth(), today.getDate()) : undefined;
    const futureBusyDates = startOfToday
      ? busyDates.filter((date) => {
          const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
          return normalizedDate.getTime() >= startOfToday.getTime();
        })
      : busyDates;

    return (
      <Card
        ref={ref}
        className="p-6 bg-card border-border/50"
      >
        <div className="space-y-6">
          <div>
            <CardTitle className="text-2xl font-semibold text-foreground mb-2">
              {title}
            </CardTitle>
            {description ? (
              <CardDescription className="text-sm text-muted-foreground">
                {description}
              </CardDescription>
            ) : null}
          </div>

          {/* Month Navigation estilo Marina */}
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onPrev}
              disabled={disablePrev}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-base font-medium">
              {currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onNext}
              disabled={disableNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          {/* Calendar Grid estilo Marina */}
          <div className="space-y-2">
            <div className="grid grid-cols-7 gap-1">
              {['LU', 'MA', 'MI', 'JU', 'VI', 'SÁ', 'DO'].map((day) => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>
            <Calendar
              mode="single"
              selected={selectedDate}
              month={currentMonth}
              onSelect={onSelectDay}
              onMonthChange={onMonthChange}
              modifiers={{
                busy: futureBusyDates,
                today: today ? [today] : [],
                weekend: { dayOfWeek: [0, 6] },
                ...(startOfToday ? { past: { before: startOfToday } } : {}),
              }}
              modifiersClassNames={{
                busy: 'bg-primary text-primary-foreground hover:bg-primary/80 shadow-lg shadow-primary/20',
                today: 'bg-accent text-accent-foreground',
                selected: 'bg-primary text-primary-foreground',
                weekend: 'text-muted-foreground/50',
                past: 'text-muted-foreground/30',
                disabled: 'text-muted-foreground/30',
                outside: 'text-muted-foreground/30',
              }}
              className="w-full"
              classNames={{
                months: 'w-full',
                month: 'w-full',
                caption: 'hidden',
                month_caption: 'sr-only',
                caption_label: 'sr-only',
                month_grid: 'w-full mt-0',
                weekdays: 'hidden',
                weekday: 'hidden',
                week: 'grid grid-cols-7 gap-1 mt-0',
                day: 'aspect-square',
                day_button: 'aspect-square rounded-lg text-sm font-medium transition-all relative w-full h-full flex items-center justify-center hover:bg-muted/50',
                day_selected: '',
                day_today: '',
                day_outside: '',
                day_disabled: '',
                day_hidden: 'invisible',
                nav: 'hidden',
              }}
              hideNavigation
              fromMonth={fromMonth}
              toMonth={toMonth}
            />
          </div>

          {/* Days with appointments toggle estilo Marina */}
          <div className="flex items-center justify-between pt-4 border-t border-border/50">
            <label htmlFor="appointments-toggle" className="text-sm font-medium text-foreground cursor-pointer">
              Días con citas
            </label>
            <Switch id="appointments-toggle" defaultChecked />
          </div>
        </div>
      </Card>
    );
  }
);

CalendarCard.displayName = 'AgendaCalendarCard';

const CalendarLegendItem = ({ indicatorClassName, label }: LegendItemProps) => (
  <div className="flex items-center gap-2 sm:gap-3">
    <span className={cn('h-2.5 w-2.5 rounded-full sm:h-3 sm:w-3', indicatorClassName)} aria-hidden />
    <span className="text-xs font-semibold text-white sm:text-sm">{label}</span>
  </div>
);
