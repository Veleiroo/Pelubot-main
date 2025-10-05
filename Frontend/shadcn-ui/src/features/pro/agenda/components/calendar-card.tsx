import { forwardRef } from 'react';

import { Calendar } from '@/components/ui/calendar';
import { CalendarNav } from '@/components/ui/CalendarNav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
      title = 'Calendario general',
      description = 'Visualiza tus citas del mes sin salir de esta pantalla.',
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
        className="flex flex-col gap-3 rounded-3xl border border-white/12 bg-gradient-to-br from-[#0b1220] via-[#111d36] to-[#0b1220] p-4 text-white shadow-[0_20px_60px_rgba(2,6,23,0.65)] ring-1 ring-white/10 md:gap-4 md:p-6"
      >
          <CardHeader className="p-0 text-center">
            <CardTitle className="text-center text-2xl font-semibold tracking-tight text-white md:text-[2.6rem] md:leading-tight">
              {title}
            </CardTitle>
            <CardDescription className="mx-auto max-w-sm text-xs leading-tight text-white/60 md:hidden">
              {description}
            </CardDescription>
        </CardHeader>
          <CardContent className="flex flex-1 flex-col items-center justify-center gap-4 p-0">
            <CalendarNav
              month={currentMonth}
              onPrev={onPrev}
              onNext={onNext}
              disablePrev={disablePrev}
              disableNext={disableNext}
              className="mt-2 self-center md:mt-3"
            />
            <div className="mx-auto flex w-full max-w-[23rem] justify-center rounded-[2rem] border border-white/12 bg-gradient-to-br from-white/12 via-white/6 to-white/0 p-4 shadow-inner shadow-emerald-900/15 backdrop-blur-sm md:max-w-[24rem] md:p-5">
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
                busy: 'calendar-day--busy text-emerald-200 font-semibold',
                today:
                  'calendar-day--today ring-[1.5px] ring-white/55 bg-white/10 text-white rounded-full focus-visible:outline-none',
                selected:
                  'calendar-day--selected ring-[1.5px] ring-white/55 bg-white/14 text-white font-semibold shadow-[0_12px_32px_rgba(15,23,42,0.28)] hover:bg-white/16 rounded-full focus-visible:outline-none',
                weekend: 'text-white/70',
                past:
                  'calendar-day--past text-white/35 hover:bg-transparent hover:text-white/35 hover:ring-0 focus-visible:ring-0 active:scale-100 cursor-default',
                disabled: 'cursor-not-allowed opacity-35 hover:bg-transparent',
                outside: 'text-white/35',
              }}
              className="mx-auto w-full max-w-[21.5rem] text-white/92"
              classNames={{
                months: 'flex flex-col items-center gap-3 md:gap-4',
                month: 'flex flex-col items-center',
                caption: 'hidden',
                month_caption: 'sr-only',
                caption_label: 'sr-only',
                table: 'table-fixed border-collapse text-white/90 mx-auto',
                head_row: '',
                head_cell:
                  'h-6 text-center text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-white/60 md:h-7 md:text-[0.78rem]',
                row: '',
                cell: 'p-0 text-center align-middle transition-colors duration-150',
                day: 'p-0 text-center align-middle',
                day_button: cn(
                  'relative flex h-12 w-12 items-center justify-center rounded-full text-lg font-semibold text-white/85 transition-[box-shadow,color,transform] duration-150 ease-out md:h-[3.25rem] md:w-[3.25rem] md:rounded-full',
                  'hover:bg-white/10 hover:text-white hover:ring-2 hover:ring-white/55',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
                  'active:scale-[0.97] active:bg-white/15',
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
