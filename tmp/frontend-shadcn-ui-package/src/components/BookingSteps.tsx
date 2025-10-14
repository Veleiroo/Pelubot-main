import { cn } from '@/lib/utils';

type Props = { step: 1 | 2 | 3 };

export function BookingSteps({ step }: Props) {
  const items: Array<{ label: string; index: 1 | 2 | 3 }> = [
    { label: 'Servicio', index: 1 },
    { label: 'Fecha y hora', index: 2 },
    { label: 'Confirmar', index: 3 },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl px-3 md:px-6">
      <ol className="flex items-center justify-between gap-3 md:gap-4">
        {items.map((item, idx) => {
          const reached = step >= item.index;
          const current = step === item.index;
          const lineActive = step > item.index;

          return (
            <li key={item.index} className="flex flex-1 flex-col items-center gap-2 text-center">
              <div className="relative flex w-full items-center justify-center">
                {idx > 0 && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      'absolute left-0 top-1/2 h-[2px] w-1/2 -translate-y-1/2 rounded-full transition-colors',
                      lineActive ? 'bg-emerald-400' : 'bg-white/10'
                    )}
                  />
                )}
                <span
                  className={cn(
                    'grid size-9 place-items-center rounded-full border text-sm font-semibold transition-colors',
                    current
                      ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200 shadow-[0_0_0_2px_rgba(16,185,129,0.25)]'
                      : reached
                        ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-100'
                        : 'border-white/15 bg-white/5 text-white/50'
                  )}
                >
                  <span>{item.index}</span>
                </span>
                {idx < items.length - 1 && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      'absolute right-0 top-1/2 h-[2px] w-1/2 -translate-y-1/2 rounded-full transition-colors',
                      reached ? 'bg-emerald-400' : 'bg-white/10'
                    )}
                  />
                )}
              </div>
              <span className="text-[11px] uppercase tracking-[0.18em] text-white/55 md:text-xs">{item.label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default BookingSteps;
