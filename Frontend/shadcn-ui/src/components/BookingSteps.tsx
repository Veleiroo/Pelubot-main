type Props = { step: 1 | 2 | 3 };

export function BookingSteps({ step }: Props) {
  const items: Array<{ label: string; index: 1 | 2 | 3 }> = [
    { label: 'Servicio', index: 1 },
    { label: 'Fecha y hora', index: 2 },
    { label: 'Confirmar', index: 3 },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl px-2 md:px-6">
      <div className="grid grid-cols-3 items-start gap-3">
        {items.map((item, idx) => {
          const reached = step >= item.index;
          const completed = step > item.index;

          return (
            <div key={item.index} className="flex flex-col items-center gap-2 text-center">
              <div className="relative flex w-full items-center justify-center">
                {idx > 0 && (
                  <span
                    className={`absolute left-0 top-1/2 h-px w-1/2 -translate-y-1/2 ${reached ? 'bg-emerald-500' : 'bg-white/10'}`}
                    aria-hidden="true"
                  />
                )}
                <span className="grid size-7 place-items-center rounded-full border border-white/15 bg-white/5">
                  <span className={`size-3 rounded-full ${reached ? 'bg-emerald-500' : 'bg-white/25'}`} />
                </span>
                {idx < items.length - 1 && (
                  <span
                    className={`absolute right-0 top-1/2 h-px w-1/2 -translate-y-1/2 ${completed ? 'bg-emerald-500' : 'bg-white/10'}`}
                    aria-hidden="true"
                  />
                )}
              </div>
              <span className="text-[10px] uppercase tracking-[0.18em] text-white/60 md:text-xs">{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default BookingSteps;
