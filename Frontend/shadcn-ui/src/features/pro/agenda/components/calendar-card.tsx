import { forwardRef } from 'react';

import { Calendar } from '@/components/ui/calendar';
import { CalendarNav } from '@/components/ui/CalendarNav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

    return (
      <Card
        ref={ref}
        className="group relative flex flex-col overflow-hidden rounded-[2rem] border border-slate-700/40 bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 text-white shadow-2xl shadow-slate-950/50 backdrop-blur-xl transition-all duration-300 hover:shadow-emerald-500/5"
      >
        {/* Efecto de luz superior */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
        
        <CardHeader className="relative flex shrink-0 flex-col items-center gap-4 border-b border-slate-700/30 bg-gradient-to-b from-slate-800/50 to-transparent px-4 pb-4 pt-5 backdrop-blur-sm sm:px-6 sm:pb-5 sm:pt-6">
          <CalendarNav
            month={currentMonth}
            onPrev={onPrev}
            onNext={onNext}
            disablePrev={disablePrev}
            disableNext={disableNext}
            className="group/nav w-full max-w-[20rem] rounded-2xl border border-slate-600/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 px-4 py-2.5 text-base font-bold text-white shadow-lg shadow-slate-950/30 ring-1 ring-slate-700/50 backdrop-blur-md transition-all duration-300 hover:border-emerald-500/40 hover:shadow-emerald-500/10 hover:ring-emerald-500/30 sm:px-5 sm:py-3 sm:text-lg"
          />
        </CardHeader>
        <CardContent className="relative flex flex-1 flex-col items-center justify-center px-4 pb-6 pt-5 sm:px-6 sm:pb-8 sm:pt-7">
          <Calendar
              mode="single"
              selected={selectedDate}
              month={currentMonth}
              onSelect={onSelectDay}
              onMonthChange={onMonthChange}
              modifiers={{
                busy: busyDates,
                today: today ? [today] : [],
                weekend: { dayOfWeek: [0, 6] },
                ...(startOfToday ? { past: { before: startOfToday } } : {}),
              }}
              modifiersClassNames={{    
                busy:
                  'calendar-day--busy relative after:absolute after:bottom-1.5 after:left-1/2 after:h-2 after:w-2 after:-translate-x-1/2 after:rounded-full after:bg-gradient-to-br after:from-emerald-400 after:to-emerald-500 after:shadow-[0_0_10px_rgba(52,211,153,0.9)] after:content-[""] after:animate-pulse',
                today:
                  'calendar-day--today',
                selected:
                  'calendar-day--selected',
                weekend: 'text-white/70',
                past:
                  'calendar-day--past',
                disabled: 'cursor-not-allowed opacity-20',
                outside: 'opacity-25',
              }}
              className="pelu-cal mx-auto w-full !px-0"
              classNames={{
                months: 'flex flex-col items-center',
                month: 'flex flex-col items-center w-full',
                caption: 'hidden',
                month_caption: 'sr-only',
                caption_label: 'sr-only',
                month_grid: 'w-full',
                weekdays: 'flex w-full',
                weekday: 'flex-1 text-center',
                week: 'flex w-full mt-1',
                day: 'flex-1 p-1',
                day_button: 'w-full h-full mx-0 my-0',
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
          <div className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-2xl border border-slate-600/40 bg-gradient-to-br from-slate-800/60 to-slate-900/60 px-4 py-3 text-xs text-white/80 shadow-lg shadow-slate-950/30 backdrop-blur-md ring-1 ring-slate-700/40 sm:mt-6 sm:gap-3 sm:px-5 sm:py-3.5 sm:text-sm">
            {legendItems.map((item) => (
              <CalendarLegendItem key={item.label} {...item} />
            ))}
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
    <span className="text-xs font-semibold text-white sm:text-sm">{label}</span>
  </div>
);
