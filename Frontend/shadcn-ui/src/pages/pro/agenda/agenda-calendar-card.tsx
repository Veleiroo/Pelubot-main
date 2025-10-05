import type { DayContentProps } from 'react-day-picker';

import { Calendar } from '@/components/ui/calendar';
import { CalendarNav } from '@/components/ui/CalendarNav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import { WEEKDAY_LABELS } from './constants';

export type AgendaCalendarCardProps = {
  selectedDate: Date;
  currentMonth: Date;
  today: Date;
  busyDates: Date[];
  fromMonth: Date;
  toMonth: Date;
  title?: string;
  description?: string;
  disablePrev?: boolean;
  disableNext?: boolean;
  onSelectDay: (day?: Date) => void;
  onMonthChange: (month: Date) => void;
  onPrev: () => void;
  onNext: () => void;
};

const DayContent = ({ date, activeModifiers }: DayContentProps) => {
  const dayNumber = date.getDate();
  const showBusyDot = activeModifiers.busy && !activeModifiers.disabled;

  return (
    <span className="relative flex flex-col items-center justify-center gap-1">
      <span>{dayNumber}</span>
      {showBusyDot ? <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" aria-hidden="true" /> : null}
    </span>
  );
};

export const AgendaCalendarCard = ({
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
}: AgendaCalendarCardProps) => {
  return (
    <Card className="text-card-foreground flex flex-col gap-6 rounded-[2.5rem] border border-white/12 bg-white/[0.08] p-6 shadow-[0_45px_95px_-55px_rgba(16,185,129,0.55)] backdrop-blur-xl md:p-8">
      <CardHeader className="flex flex-col items-center gap-3 p-0 text-center">
        <CardTitle className="text-center text-[1.75rem] font-semibold tracking-tight text-white md:text-[2.5rem] md:leading-[1.05]">
          {title}
        </CardTitle>
        <CardDescription className="mx-auto max-w-sm text-xs leading-tight text-white/60 md:text-sm">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-5 p-0">
        <CalendarNav
          month={currentMonth}
          onPrev={onPrev}
          onNext={onNext}
          disablePrev={disablePrev}
          disableNext={disableNext}
          className="w-full !justify-between"
        />
        <div className="hidden w-full grid-cols-7 gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-white/55 md:grid md:text-[0.75rem]">
          {WEEKDAY_LABELS.map((label) => (
            <span key={label} className="flex h-7 items-center justify-center">
              {label}
            </span>
          ))}
        </div>
        <div className="w-full rounded-[2.25rem] border border-white/10 bg-gradient-to-b from-white/[0.12] via-white/[0.07] to-white/[0.04] px-4 pb-6 pt-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] outline outline-1 outline-white/8 md:px-6 md:pb-7 md:pt-6">
          <Calendar
            mode="single"
            selected={selectedDate}
            month={currentMonth}
            onSelect={onSelectDay}
            onMonthChange={onMonthChange}
            fromMonth={fromMonth}
            toMonth={toMonth}
            hideNavigation
            modifiers={{
              busy: busyDates,
              today: [today],
              weekend: { dayOfWeek: [0, 6] },
            }}
            modifiersClassNames={{
              busy: 'after:absolute after:bottom-2 after:h-1.5 after:w-1.5 after:rounded-full after:bg-emerald-300 after:content-[\'\']',
              today: 'ring-2 ring-white/80 text-white',
              selected:
                'bg-emerald-400/25 text-emerald-50 ring-2 ring-emerald-300 shadow-[0_18px_48px_-32px_rgba(16,185,129,0.65)]',
              weekend: 'text-white/75',
              disabled: 'cursor-not-allowed opacity-40',
              outside: 'text-white/35 opacity-60',
            }}
            className="pros-agenda-calendar w-full text-white/92"
            classNames={{
              months: 'flex w-full flex-col gap-3 md:gap-4',
              month: 'w-full',
              caption: 'hidden',
              month_caption: 'sr-only',
              caption_label: 'sr-only',
              table: 'w-full border-collapse text-white/92',
              head_row: 'grid grid-cols-7 gap-2 md:hidden',
              head_cell:
                'flex h-6 items-center justify-center text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-white/55 md:h-7 md:text-[0.75rem]',
              row: 'grid grid-cols-7 gap-2 md:gap-3',
              cell: 'flex items-center justify-center text-center',
              day: 'flex items-center justify-center text-center',
              day_button: cn(
                'relative flex h-11 w-11 items-center justify-center rounded-2xl text-base font-semibold text-white/80 transition-all duration-150 md:h-[3.1rem] md:w-[3.1rem]',
                'bg-white/6 shadow-[inset_0_-1px_0_rgba(255,255,255,0.12)] ring-1 ring-white/8',
                'hover:bg-white/12 hover:text-white hover:ring-white/35',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80',
                'active:duration-75',
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
            components={{
              DayContent,
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
};
