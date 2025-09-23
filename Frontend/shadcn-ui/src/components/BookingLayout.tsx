import { ReactNode } from 'react';
import { BookingSteps } from '@/components/BookingSteps';

interface BookingLayoutProps {
  step: 1 | 2 | 3;
  title: string;
  subtitle?: string;
  summary?: string;
  children: ReactNode;
}

export function BookingLayout({ step, title, subtitle, summary, children }: BookingLayoutProps) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 text-foreground md:px-6">
      <div className="mb-4">
        <BookingSteps step={step} />
      </div>
      <header className="mx-auto max-w-3xl text-center text-white">
        <h1 className="text-base font-semibold md:text-lg">{title}</h1>
        {summary && (
          <div className="mt-1 text-xs text-white/70" aria-live="polite">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
              <span className="size-2 rounded-full bg-emerald-500" />
              {summary}
            </span>
          </div>
        )}
        {subtitle && <p className="mt-1 text-xs text-white/60 md:text-sm">{subtitle}</p>}
      </header>
      <div className="mx-auto mt-6 w-full max-w-3xl space-y-6">
        {children}
      </div>
    </div>
  );
}

export default BookingLayout;
