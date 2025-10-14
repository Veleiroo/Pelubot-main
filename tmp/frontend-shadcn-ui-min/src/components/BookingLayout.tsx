import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
interface BookingLayoutProps {
  title?: string;
  subtitle?: string;
  summary?: string;
  children: ReactNode;
  className?: string;
}

export function BookingLayout({ title, subtitle, summary, children, className }: BookingLayoutProps) {
  return (
    <div className={cn('mx-auto w-full max-w-[960px] px-4 py-6 text-foreground md:px-6', className)}>
      {(title || subtitle || summary) && (
        <header className="mb-4 text-center text-white md:mb-6">
          {title && <h1 className="text-2xl font-semibold tracking-tight md:text-[28px]">{title}</h1>}
          {subtitle && <p className="mt-1 text-sm text-white/60 md:text-base">{subtitle}</p>}
          {summary && <p className="mt-1 text-xs text-white/55 md:text-sm">{summary}</p>}
        </header>
      )}
      <div className="w-full">
        {children}
      </div>
    </div>
  );
}

export default BookingLayout;
