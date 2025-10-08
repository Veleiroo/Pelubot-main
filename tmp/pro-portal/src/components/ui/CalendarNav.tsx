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
        className="flex h-10 w-10 flex-none items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/80 disabled:cursor-not-allowed disabled:opacity-35 md:h-11 md:w-11"
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
        className="flex h-10 w-10 flex-none items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/80 disabled:cursor-not-allowed disabled:opacity-35 md:h-11 md:w-11"
      >
        <ChevronRight className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
}

export default CalendarNav;
