import { forwardRef, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

import type { AgendaCalendarCardProps } from '../types';

const legendItems = [{ indicatorClassName: 'bg-emerald-400', label: 'Días con citas' }];

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
      <Card ref={ref} className="flex h-full flex-col border-white/10 bg-slate-950/60 text-white">
        <CardHeader className="gap-4 border-b border-white/10 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-lg font-semibold">{title}</CardTitle>
              {description ? (
                <CardDescription className="text-xs text-white/70 sm:text-sm">{description}</CardDescription>
              ) : null}
            </div>
            <div className="flex items-center gap-1 rounded-md bg-white/5 p-1 text-white/80">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white/80 hover:bg-white/10 hover:text-white disabled:text-white/40"
                onClick={onPrev}
                disabled={disablePrev}
                aria-label="Mes anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-3 text-sm font-medium capitalize text-white">{monthLabel}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white/80 hover:bg-white/10 hover:text-white disabled:text-white/40"
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
              months: 'w-full space-y-4',
              month: 'flex flex-col gap-4',
              caption: 'hidden',
              month_caption: 'sr-only',
              caption_label: 'sr-only',
              month_grid: 'w-full',
              weekdays: 'grid w-full grid-cols-7 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-white/60 sm:text-xs',
              weekday: 'flex h-9 items-center justify-center',
              week: 'grid grid-cols-7 gap-2',
              day: 'aspect-square',
              day_button:
                'group/calendar-day relative flex h-full w-full items-center justify-center rounded-lg border border-transparent text-sm font-medium text-white/80 transition-colors hover:border-white/40 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
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

          <div className="flex flex-col gap-4 rounded-lg border border-white/10 bg-white/5 p-4 text-xs text-white/70 sm:flex-row sm:items-center sm:justify-between sm:text-sm">
            <div className="flex items-center gap-3">
              {legendItems.map((item) => (
                <span key={item.label} className="flex items-center gap-2">
                  <span className={cn('h-2.5 w-2.5 rounded-full', item.indicatorClassName)} aria-hidden />
                  <span>{item.label}</span>
                </span>
              ))}
            </div>
            <label htmlFor="agenda-busy-toggle" className="flex items-center gap-3 font-medium text-white/80">
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
