import { addMonths, format } from 'date-fns';
import { es } from 'date-fns/locale';

import { ChevronLeft, ChevronRight } from '@/lib/icons';
import { cn } from '@/lib/utils';

interface Props {
  month: Date;
  onPrev: () => void;
  onNext: () => void;
  onGoToMonth?: (next: Date) => void;
  disablePrev?: boolean;
  disableNext?: boolean;
  className?: string;
}

export function CalendarNav({
  month,
  onPrev,
  onNext,
  onGoToMonth,
  disablePrev,
  disableNext,
  className,
}: Props) {
  const goPrev = () => {
    if (disablePrev) return;
    if (onGoToMonth) onGoToMonth(addMonths(month, -1));
    onPrev();
  };
  const goNext = () => {
    if (disableNext) return;
    if (onGoToMonth) onGoToMonth(addMonths(month, 1));
    onNext();
  };

  return (
    <div
      className={cn(
        'flex items-center justify-center gap-3 text-white/80 md:gap-3.5',
        'text-center',
        className
      )}
    >
      <button
        type="button"
        aria-label="Mes anterior"
        onClick={goPrev}
        disabled={disablePrev}
        className="flex h-10 w-10 flex-none items-center justify-center rounded-full text-white/80 transition-all duration-200 hover:scale-110 hover:bg-slate-700/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800 disabled:cursor-not-allowed disabled:opacity-35 md:h-11 md:w-11"
      >
        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
      </button>
      <span className="text-base font-semibold capitalize tracking-tight text-white md:text-lg">
        {format(month, 'LLLL yyyy', { locale: es })}
      </span>
      <button
        type="button"
        aria-label="Mes siguiente"
        onClick={goNext}
        disabled={disableNext}
        className="flex h-10 w-10 flex-none items-center justify-center rounded-full text-white/80 transition-all duration-200 hover:scale-110 hover:bg-slate-700/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800 disabled:cursor-not-allowed disabled:opacity-35 md:h-11 md:w-11"
      >
        <ChevronRight className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
}

export default CalendarNav;
