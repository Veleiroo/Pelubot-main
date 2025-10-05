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
    indicatorClassName: 'bg-emerald-300/90 shadow-[0_0_0_3px_rgba(16,185,129,0.18)]',
    label: 'Días con citas',
  },
  {
    indicatorClassName: 'bg-white/90 shadow-[0_0_0_3px_rgba(255,255,255,0.16)]',
    label: 'Hoy',
  },
  {
    indicatorClassName: 'bg-white/35 shadow-[0_0_0_3px_rgba(255,255,255,0.08)]',
    label: 'Pasado',
  },
  {
    indicatorClassName: 'bg-cyan-200/80 shadow-[0_0_0_3px_rgba(8,145,178,0.16)]',
    label: 'Fines de semana',
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
        className={cn(
          'group relative flex flex-col gap-4 overflow-hidden rounded-[2.1rem] border border-white/12 text-white shadow-[0_24px_70px_rgba(3,7,18,0.7)] ring-1 ring-white/10 backdrop-blur-md md:gap-5',
          'bg-slate-950/80 before:absolute before:-inset-px before:-z-10 before:rounded-[2.25rem] before:border before:border-white/8 before:bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.24),transparent_60%)] before:opacity-90 before:transition-opacity before:duration-300 before:ease-out',
          'after:pointer-events-none after:absolute after:inset-x-8 after:top-0 after:-z-10 after:h-32 after:rounded-full after:bg-[radial-gradient(circle_at_top,rgba(236,72,153,0.18),transparent_65%)] after:opacity-40 after:blur-3xl'
        )}
      >
        <CardHeader className="flex flex-col items-center gap-2 p-0 text-center md:gap-3">
          <CardTitle className="text-balance text-center text-2xl font-semibold tracking-tight text-white md:text-[2.55rem] md:leading-tight">
            {title}
          </CardTitle>
          <CardDescription className="mx-auto max-w-sm text-xs leading-tight text-white/70 md:text-sm md:leading-snug">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col items-center justify-center gap-4 p-0 md:gap-6">
          <CalendarNav
            month={currentMonth}
            onPrev={onPrev}
            onNext={onNext}
            disablePrev={disablePrev}
            disableNext={disableNext}
            className="mt-2 w-full max-w-[18rem] self-center rounded-full border border-white/12 bg-white/6 px-4 py-1.5 text-sm font-medium text-white/90 shadow-inner shadow-slate-900/40 ring-1 ring-white/10 md:mt-1.5"
          />
          <div className="mx-auto flex w-full max-w-[23.5rem] justify-center rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/12 via-white/8 to-white/0 p-4 shadow-inner shadow-emerald-900/20 backdrop-blur md:max-w-[24.75rem] md:p-6">
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
                weekend: 'text-white/75',
                past:
                  'calendar-day--past text-white/35 hover:bg-transparent hover:text-white/35 hover:ring-0 focus-visible:ring-0 active:scale-100 cursor-default',
                disabled: 'cursor-not-allowed opacity-35 hover:bg-transparent',
                outside: 'text-white/35',
              }}
              className="mx-auto w-full max-w-[21.75rem] text-white/92"
              classNames={{
                months: 'flex flex-col items-center gap-4 md:gap-5',
                month: 'flex flex-col items-center',
                caption: 'hidden',
                month_caption: 'sr-only',
                caption_label: 'sr-only',
                table: 'table-fixed border-collapse text-white/90 mx-auto [&>tbody]:gap-y-2',
                head_row: '',
                head_cell:
                  'h-6 text-center text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-white/60 md:h-7 md:text-[0.78rem]',
                row: '',
                cell: 'p-0 text-center align-middle transition-colors duration-150 md:px-[1px]',
                day: 'p-0 text-center align-middle',
                day_button: cn(
                  'relative flex h-12 w-12 items-center justify-center rounded-full text-lg font-semibold text-white/85 transition-[box-shadow,color,transform] duration-150 ease-out md:h-[3.35rem] md:w-[3.35rem] md:rounded-full',
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
          <div className="flex w-full max-w-[24.75rem] flex-wrap items-center justify-center gap-2.5 text-[0.7rem] text-white/60 md:text-xs">
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
  <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 shadow-inner shadow-slate-900/20">
    <span className={cn('h-2.5 w-2.5 rounded-full', indicatorClassName)} aria-hidden />
    <span className="font-medium text-white/70">{label}</span>
  </div>
);
