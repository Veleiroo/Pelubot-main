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
    <div className="mx-auto max-w-5xl px-4 py-6 text-foreground md:px-6">
      <div className="mb-4">
        <BookingSteps step={step} />
      </div>
      <header className="mx-auto max-w-3xl text-center text-white">
        <h1 className="text-xl font-semibold md:text-2xl">{title}</h1>
        {summary && (
          <div className="mt-2 text-sm text-white/70" aria-live="polite">
            <span className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-1.5">
              {summary}
            </span>
          </div>
        )}
        {subtitle && <p className="mt-2 text-sm text-white/60">{subtitle}</p>}
      </header>
      <div className="mx-auto mt-8 w-full max-w-4xl space-y-6">
        {children}
      </div>
    </div>
  );
}

export default BookingLayout;
