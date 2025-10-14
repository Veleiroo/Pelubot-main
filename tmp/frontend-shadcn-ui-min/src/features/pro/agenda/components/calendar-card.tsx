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
    const futureBusyDates = startOfToday
      ? busyDates.filter((date) => {
          const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
          return normalizedDate.getTime() >= startOfToday.getTime();
        })
      : busyDates;

    return (
      <Card
        ref={ref}
        className="group relative flex flex-col overflow-hidden rounded-[1.75rem] border border-slate-800/45 bg-[radial-gradient(120%_120%_at_0%_0%,rgba(16,185,129,0.12),rgba(2,6,23,0)),linear-gradient(145deg,rgba(15,23,42,0.92),rgba(12,20,38,0.96))] text-white shadow-[0_24px_60px_rgba(2,8,23,0.55)] transition-all duration-300 hover:border-emerald-400/45 hover:shadow-[0_30px_80px_rgba(6,22,45,0.55)]"
      >
        {/* Efecto de luz superior */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent" />

        <CardHeader className="relative flex shrink-0 flex-col gap-5 border-b border-white/5 bg-white/[0.02] px-6 py-7 text-left backdrop-blur-sm sm:px-8">
          <div className="flex flex-col gap-2">
            <CardTitle className="text-3xl font-semibold tracking-tight text-white drop-shadow-[0_4px_18px_rgba(15,23,42,0.45)] sm:text-[2rem]">
              {title}
            </CardTitle>
            {description ? (
              <CardDescription className="max-w-[22rem] text-sm text-slate-200/75 sm:text-base">
                {description}
              </CardDescription>
            ) : null}
          </div>
          <CalendarNav
            month={currentMonth}
            onPrev={onPrev}
            onNext={onNext}
            disablePrev={disablePrev}
            disableNext={disableNext}
            className="group/nav flex w-full items-center justify-between rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-base font-semibold text-white shadow-[0_18px_40px_rgba(5,14,32,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-400/45 hover:bg-emerald-400/10 hover:shadow-[0_26px_60px_rgba(6,22,50,0.55)] sm:px-6 sm:py-3.5 sm:text-lg"
          />
        </CardHeader>
        <CardContent className="relative flex flex-1 flex-col gap-6 px-6 pb-8 pt-6 sm:px-8 sm:pb-10">
          <div className="pointer-events-none absolute inset-x-8 top-1/3 -z-10 h-48 rounded-full bg-emerald-500/5 blur-[120px]" />
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
              month: 'flex flex-col gap-3',
              caption: 'hidden',
              month_caption: 'sr-only',
              caption_label: 'sr-only',
              month_grid: 'w-full',
              weekdays: 'grid w-full grid-cols-7 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-300/65',
              weekday: 'flex h-9 items-center justify-center',
              week: 'grid grid-cols-7 gap-2',
              day: 'aspect-square',
              day_button:
                'group/calendar-day relative flex h-full w-full items-center justify-center rounded-[1rem] border border-transparent text-sm font-semibold text-slate-200 transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400/80',
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
          <div className="flex w-full items-center gap-2.5 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-xs text-white/75 shadow-[0_18px_38px_rgba(4,12,32,0.45)] sm:px-5 sm:py-3.5 sm:text-sm">
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
