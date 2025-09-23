import { addMonths, format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  month: Date;
  onPrev: () => void;
  onNext: () => void;
  onGoToMonth?: (next: Date) => void;
}

export function CalendarNav({ month, onPrev, onNext, onGoToMonth }: Props) {
  const goPrev = () => {
    if (onGoToMonth) onGoToMonth(addMonths(month, -1));
    onPrev();
  };
  const goNext = () => {
    if (onGoToMonth) onGoToMonth(addMonths(month, 1));
    onNext();
  };

  return (
    <div className="relative mb-3 md:mb-4">
      <button
        type="button"
        aria-label="Mes anterior"
        onClick={goPrev}
        className="absolute left-0 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-lg text-white/80 transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
      >
        ‹
      </button>
      <span className="block text-center text-base font-medium capitalize text-white/90 md:text-lg">
        {format(month, 'LLLL yyyy', { locale: es })}
      </span>
      <button
        type="button"
        aria-label="Mes siguiente"
        onClick={goNext}
        className="absolute right-0 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-lg text-white/80 transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
      >
        ›
      </button>
    </div>
  );
}

export default CalendarNav;
