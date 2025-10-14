import { forwardRef, useMemo, useState } from 'react';
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
    indicatorClassName: 'bg-primary shadow-[0_0_0_2px_rgba(16,185,129,0.22)]',
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
    const [showBusyDays, setShowBusyDays] = useState(true);

    const startOfToday = useMemo(() => {
      if (!today) return null;
      return new Date(today.getFullYear(), today.getMonth(), today.getDate());
    }, [today]);

    const startOfTodayTime = startOfToday?.getTime();

    const futureBusyDates = useMemo(() => {
      if (!startOfTodayTime) return busyDates;
      return busyDates.filter((date) => {
        const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        return normalizedDate.getTime() >= startOfTodayTime;
      });
    }, [busyDates, startOfTodayTime]);

    const busyModifierDates = showBusyDays ? futureBusyDates : [];

    const monthLabel = useMemo(() => {
      const monthName = currentMonth.toLocaleDateString('es-ES', { month: 'long' });
      const normalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
      return `${normalizedMonth} ${currentMonth.getFullYear()}`;
    }, [currentMonth]);

    return (
      <Card
        ref={ref}
        className="group relative flex flex-col overflow-hidden rounded-[1.5rem] border border-border/60 bg-card/80 text-foreground shadow-soft transition-colors duration-300 hover:border-border"
      >
        <CardHeader className="relative flex shrink-0 flex-col gap-6 border-b border-border/60 bg-card/70 px-6 py-6 text-left backdrop-blur-sm sm:px-8">
          <div className="flex flex-col gap-1.5">
            <CardTitle className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]">
              {title}
            </CardTitle>
            {description ? (
              <CardDescription className="max-w-[22rem] text-sm text-muted-foreground sm:text-base">
                {description}
              </CardDescription>
            ) : null}
          </div>
          <div className="group/nav flex w-full items-center justify-between rounded-2xl border border-border/60 bg-background/40 px-4 py-3 text-base font-medium text-muted-foreground shadow-soft transition-colors duration-300 sm:px-6 sm:py-3.5 sm:text-lg">
            <Button
              variant="ghost"
              size="icon"
              onClick={onPrev}
              disabled={disablePrev}
              className="text-muted-foreground hover:bg-muted/40 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-base font-medium capitalize text-foreground">
              {monthLabel}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onNext}
              disabled={disableNext}
              className="text-muted-foreground hover:bg-muted/40 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="relative flex flex-1 flex-col gap-6 px-6 pb-8 pt-6 sm:px-8 sm:pb-10">
          <Calendar
            mode="single"
            selected={selectedDate}
            month={currentMonth}
            onSelect={onSelectDay}
            onMonthChange={onMonthChange}
            modifiers={{
              busy: busyModifierDates,
              today: startOfToday ? [startOfToday] : [],
              weekend: { dayOfWeek: [0, 6] },
              ...(startOfToday ? { past: { before: startOfToday } } : {}),
            }}
            modifiersClassNames={{
              busy: 'calendar-day--busy',
              today: 'calendar-day--today',
              selected: 'calendar-day--selected',
              weekend: 'calendar-day--weekend',
              past: 'calendar-day--past',
              disabled: 'calendar-day--disabled',
              outside: 'calendar-day--outside',
            }}
            className="pelu-cal mx-auto w-full !px-0"
            classNames={{
              months: 'w-full space-y-6',
              month: 'flex flex-col gap-4',
              caption: 'hidden',
              month_caption: 'sr-only',
              caption_label: 'sr-only',
              month_grid: 'w-full',
              weekdays:
                'grid w-full grid-cols-7 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80 sm:text-[0.7rem]',
              weekday: 'flex h-9 items-center justify-center',
              week: 'grid grid-cols-7 gap-2 sm:gap-3',
              day: 'aspect-square',
              day_button:
                'group/calendar-day relative flex h-full w-full items-center justify-center rounded-xl border border-transparent text-sm font-semibold text-muted-foreground transition-all duration-200 hover:border-primary/40 hover:bg-primary/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              day_selected: 'calendar-day--selected',
              day_today: 'calendar-day--today',
              day_outside: 'calendar-day--outside',
              day_disabled: 'calendar-day--disabled',
              day_hidden: 'invisible',
              nav: 'hidden',
            }}
            hideNavigation
            fromMonth={fromMonth}
            toMonth={toMonth}
          />
          <div className="flex w-full flex-col gap-4 rounded-2xl border border-border/60 bg-card/70 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-3.5 sm:text-sm">
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              {legendItems.map((item) => (
                <CalendarLegendItem key={item.label} {...item} />
              ))}
            </div>
            <label
              htmlFor="agenda-busy-toggle"
              className="flex items-center gap-3 text-sm font-medium text-muted-foreground"
            >
              <Switch id="agenda-busy-toggle" checked={showBusyDays} onCheckedChange={setShowBusyDays} />
              <span>Resaltar días con citas</span>
            </label>
          </div>
        </CardContent>
      </Card>
    );
  }
);

CalendarCard.displayName = 'AgendaCalendarCard';

const CalendarLegendItem = ({ indicatorClassName, label }: LegendItemProps) => (
  <div className="flex items-center gap-2 sm:gap-3">
    <span className={cn('h-2.5 w-2.5 rounded-full sm:h-3 sm:w-3', indicatorClassName)} aria-hidden />
    <span className="text-xs font-medium text-muted-foreground sm:text-sm">{label}</span>
  </div>
);
