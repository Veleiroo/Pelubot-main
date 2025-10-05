import { forwardRef } from 'react';

import { Calendar } from '@/components/ui/calendar';
import { CalendarNav } from '@/components/ui/CalendarNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import type { AgendaCalendarCardProps } from '../types';

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
        className="flex h-full flex-col rounded-[28px] border border-white/12 bg-slate-950/60 p-5 text-white shadow-[0_18px_40px_rgba(2,6,23,0.45)] backdrop-blur"
      >
        <CardHeader className="flex flex-col gap-2 p-0">
          <CardTitle className="text-left text-2xl font-semibold tracking-tight text-white">{title}</CardTitle>
          {description && <p className="text-sm text-white/65">{description}</p>}
        </CardHeader>
        <CardContent className="mt-2 flex flex-1 flex-col gap-5 p-0">
          <CalendarNav
            month={currentMonth}
            onPrev={onPrev}
            onNext={onNext}
            disablePrev={disablePrev}
            disableNext={disableNext}
            className="self-end rounded-full border border-white/10 bg-white/5 px-4 py-1 text-sm font-medium text-white/80 transition hover:bg-white/10"
          />
          <div className="flex-1 rounded-2xl border border-white/10 bg-slate-900/50 p-4">
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
                  'calendar-day--busy relative after:absolute after:bottom-2 after:left-1/2 after:h-1.5 after:w-1.5 after:-translate-x-1/2 after:rounded-full after:bg-emerald-300 after:content-[""]',
                today:
                  'calendar-day--today ring-2 ring-white/45 bg-white/10 text-white rounded-full focus-visible:outline-none',
                selected:
                  'calendar-day--selected ring-2 ring-emerald-300/70 bg-emerald-400/20 text-white font-semibold shadow-[0_10px_26px_rgba(5,150,105,0.35)] hover:bg-emerald-300/25 rounded-full focus-visible:outline-none',
                weekend: 'text-white/70',
                past:
                  'calendar-day--past text-white/30 hover:bg-transparent hover:text-white/30 hover:ring-0 focus-visible:ring-0 active:scale-100 cursor-default',
                disabled: 'cursor-not-allowed opacity-35 hover:bg-transparent',
                outside: 'text-white/30',
              }}
              className="mx-auto w-full max-w-[21rem] text-white/90"
              classNames={{
                months: 'flex flex-col items-center gap-3',
                month: 'flex flex-col items-center',
                caption: 'hidden',
                month_caption: 'sr-only',
                caption_label: 'sr-only',
                table: 'table-fixed border-collapse text-white/85',
                head_row: '',
                head_cell:
                  'h-6 text-center text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-white/55 md:h-7 md:text-[0.75rem]',
                row: '',
                cell: 'p-0 text-center align-middle transition-colors duration-150',
                day: 'p-0 text-center align-middle',
                day_button: cn(
                  'relative flex h-10 w-10 items-center justify-center rounded-full text-base font-semibold text-white/80 transition-[color,transform,background,box-shadow] duration-150 ease-out md:h-11 md:w-11',
                  'hover:bg-white/10 hover:text-white',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
                  'active:scale-95',
                  'disabled:hover:outline-none disabled:hover:bg-transparent',
                  'motion-reduce:transition-none [font-variant-numeric:tabular-nums]'
                ),
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
        </CardContent>
      </Card>
    );
  }
);

CalendarCard.displayName = 'AgendaCalendarCard';
