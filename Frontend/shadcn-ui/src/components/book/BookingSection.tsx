import { ReactNode } from 'react';

export function BookingSection({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 md:px-6">
      <header className="mb-6 text-center">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </header>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

export default BookingSection;
