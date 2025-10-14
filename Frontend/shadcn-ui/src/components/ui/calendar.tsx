import * as React from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from '@/lib/icons';
import { DayPicker } from 'react-day-picker';
import { es as esLocale } from 'date-fns/locale';
import type { Locale } from 'date-fns';

import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

const mergeLocale = (base: Locale, override?: Partial<Locale>): Locale => ({
  ...base,
  ...(override ?? {}),
  options: {
    ...(base.options ?? {}),
    ...(override?.options ?? {}),
    weekStartsOn: 1,
  },
});

function Calendar({ className, classNames, showOutsideDays = true, locale, ...props }: CalendarProps) {
  // Usar español con lunes como primer día.
  const loc = React.useMemo(
    () => mergeLocale(esLocale, locale ?? undefined),
    [locale]
  );

  // Límite de navegación: hoy .. hoy + 183 días (≈6 meses).
  const today = React.useMemo(() => new Date(), []);
  const toMonthDefault = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 183);
    return d;
  }, []);
  const fromMonth = props.fromMonth ?? today;
  const toMonth = props.toMonth ?? toMonthDefault;

  const mergedClassNames = React.useMemo(() => {
    const base: Record<string, string | undefined> = {
      months: cn(
        'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
        classNames?.months
      ),
      month: cn('space-y-3', classNames?.month),
      caption: cn('flex justify-center pt-1 relative items-center', classNames?.caption),
      caption_label: cn('text-sm font-medium text-neutral-100', classNames?.caption_label),
      nav: cn('space-x-1 flex items-center', classNames?.nav),
      nav_button: cn(
        buttonVariants({ variant: 'ghost' }),
        'h-7 w-7 p-0 text-neutral-100 hover:bg-neutral-800 hover:text-white',
        classNames?.nav_button
      ),
      nav_button_previous: cn('absolute left-1', classNames?.nav_button_previous),
      nav_button_next: cn('absolute right-1', classNames?.nav_button_next),
      table: cn('w-full border-collapse table-fixed', classNames?.table),
      head_row: cn('', classNames?.head_row),
      head_cell: cn(
        'text-muted-foreground h-8 text-[0.72rem] uppercase tracking-wide text-center',
        classNames?.head_cell
      ),
      row: cn('', classNames?.row),
      cell: cn('p-0 text-center align-middle', classNames?.cell),
      day: cn('p-0 text-center align-middle', classNames?.day),
      day_button: cn(
        buttonVariants({ variant: 'ghost' }),
        'h-9 w-9 p-0 font-normal aria-selected:opacity-100 inline-flex items-center justify-center mx-auto',
        classNames?.day_button
      ),
      day_range_end: cn('day-range-end', classNames?.day_range_end),
      day_selected: cn(
        'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
        classNames?.day_selected
      ),
      day_today: cn('bg-accent text-accent-foreground', classNames?.day_today),
      day_outside: cn(
        'day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30',
        classNames?.day_outside
      ),
      day_disabled: cn('text-muted-foreground opacity-50', classNames?.day_disabled),
      day_range_middle: cn(
        'aria-selected:bg-accent aria-selected:text-accent-foreground',
        classNames?.day_range_middle
      ),
      day_hidden: cn('invisible', classNames?.day_hidden),
    };

    if (classNames) {
      for (const [key, value] of Object.entries(classNames)) {
        if (!(key in base)) {
          base[key] = value;
        }
      }
    }

    return base as CalendarProps['classNames'];
  }, [classNames]);

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      locale={loc}
      fromMonth={fromMonth}
      toMonth={toMonth}
      className={cn('pelu-cal px-1.5 py-2', className)}
      classNames={mergedClassNames}
      components={{
        Chevron: ({ orientation = 'right', className, size = 16, disabled }) => {
          const Icon = (() => {
            switch (orientation) {
              case 'left':
                return ChevronLeft;
              case 'right':
                return ChevronRight;
              case 'up':
                return ChevronUp;
              case 'down':
                return ChevronDown;
              default:
                return ChevronRight;
            }
          })();
          return <Icon className={cn('h-4 w-4', disabled && 'opacity-40', className)} size={size} />;
        },
      }}
      {...props}
    />
  );
}
Calendar.displayName = 'Calendar';

export { Calendar };
