import { forwardRef, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

import type { AgendaCalendarCardProps } from '../types';

const legendItems = [{ indicatorClassName: 'bg-primary', label: 'Días con citas' }];

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
    const [highlightBusy, setHighlightBusy] = useState(true);

    const startOfToday = useMemo(() => {
      if (!today) return null;
      return new Date(today.getFullYear(), today.getMonth(), today.getDate());
    }, [today]);

    const startOfTodayTime = startOfToday?.getTime();

    const busyModifierDates = useMemo(() => {
      if (!highlightBusy) return [];
      if (!startOfTodayTime) return busyDates;
      return busyDates.filter((date) => {
        const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        return normalized.getTime() >= startOfTodayTime;
      });
    }, [busyDates, highlightBusy, startOfTodayTime]);

    const monthLabel = useMemo(() => {
      const monthName = currentMonth.toLocaleDateString('es-ES', { month: 'long' });
      const normalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
      return `${normalizedMonth} ${currentMonth.getFullYear()}`;
    }, [currentMonth]);

    return (
      <Card
        ref={ref}
        className="flex h-full flex-col border border-border/50 bg-card text-card-foreground shadow-sm"
      >
        <CardHeader className="gap-4 border-b border-border/50 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-lg font-semibold">{title}</CardTitle>
              {description ? (
                <CardDescription className="text-xs text-muted-foreground sm:text-sm">
                  {description}
                </CardDescription>
              ) : null}
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-muted/40 p-1 text-muted-foreground">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground disabled:text-muted-foreground/50"
                onClick={onPrev}
                disabled={disablePrev}
                aria-label="Mes anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-3 text-sm font-medium capitalize text-foreground">{monthLabel}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground disabled:text-muted-foreground/50"
                onClick={onNext}
                disabled={disableNext}
                aria-label="Mes siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
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
              busy:
                'after:absolute after:bottom-2 after:left-1/2 after:h-1.5 after:w-1.5 after:-translate-x-1/2 after:rounded-full after:bg-primary after:content-[""]',
              today: 'border border-primary/40 text-primary',
              selected: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary',
              weekend: 'text-muted-foreground',
              past: 'text-muted-foreground/50',
              disabled: 'pointer-events-none opacity-40',
              outside: 'pointer-events-none opacity-40',
            }}
            className="mx-auto w-full !px-0"
            classNames={{
              months: 'w-full space-y-4',
              month: 'flex flex-col gap-4',
              caption: 'hidden',
              month_caption: 'sr-only',
              caption_label: 'sr-only',
              month_grid: 'w-full',
              weekdays:
                'grid w-full grid-cols-7 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:text-xs',
              weekday: 'flex h-9 items-center justify-center',
              week: 'grid grid-cols-7 gap-2',
              day: 'aspect-square',
              day_button:
                'group relative flex h-full w-full items-center justify-center rounded-lg border border-transparent text-sm font-medium text-muted-foreground transition-colors hover:border-border hover:bg-muted/20 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              day_selected: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary',
              day_today: 'border border-primary/40 text-primary',
              day_outside: 'pointer-events-none opacity-40',
              day_disabled: 'pointer-events-none opacity-40',
              day_hidden: 'invisible',
              nav: 'hidden',
            }}
            hideNavigation
            fromMonth={fromMonth}
            toMonth={toMonth}
          />

          <div className="flex flex-col gap-4 rounded-lg border border-border/50 bg-muted/30 p-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:text-sm">
            <div className="flex items-center gap-3">
              {legendItems.map((item) => (
                <span key={item.label} className="flex items-center gap-2">
                  <span className={cn('h-2.5 w-2.5 rounded-full', item.indicatorClassName)} aria-hidden />
                  <span>{item.label}</span>
                </span>
              ))}
            </div>
            <label htmlFor="agenda-busy-toggle" className="flex items-center gap-3 font-medium text-muted-foreground">
              <Switch
                id="agenda-busy-toggle"
                checked={highlightBusy}
                onCheckedChange={setHighlightBusy}
                aria-label="Resaltar días con citas"
              />
              <span>Resaltar días con citas</span>
            </label>
          </div>
        </CardContent>
      </Card>
    );
  }
);

CalendarCard.displayName = 'AgendaCalendarCard';
