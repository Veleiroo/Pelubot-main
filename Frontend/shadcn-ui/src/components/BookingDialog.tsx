import { ReactNode, useEffect } from 'react';
import { useNavigate, type Location as RouterLocation } from 'react-router-dom';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from '@/lib/icons';
import { cn } from '@/lib/utils';

type Props = {
  background: RouterLocation;
  children: ReactNode;
};

export function BookingDialog({ background, children }: Props) {
  const navigate = useNavigate();

  const targetPath = `${background.pathname}${background.search}${background.hash}` || '/';

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      navigate(targetPath, { replace: true });
    }
  };

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous || '';
    };
  }, []);

  return (
    <DialogPrimitive.Root open onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          data-testid="booking-overlay"
          className="fixed inset-0 z-40 bg-black/60"
        />
        <DialogPrimitive.Content
          className={cn(
            'fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-4 pb-8 pt-[6vh] text-sm outline-none',
            'md:px-6 md:pt-[8vh]'
          )}
          onPointerDownOutside={(event) => {
            event.preventDefault();
            handleOpenChange(false);
          }}
          onEscapeKeyDown={(event) => {
            event.preventDefault();
            handleOpenChange(false);
          }}
        >
          <div className="relative mx-auto flex w-full max-w-[960px] justify-center">
            <div className="relative w-full overflow-hidden rounded-3xl border border-zinc-800/80 bg-zinc-900 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.75)]">
              <DialogPrimitive.Close
                className="absolute right-6 top-5 inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700/70 bg-zinc-900/95 text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 md:top-6"
                aria-label="Cerrar reserva"
              >
                <X className="h-4 w-4" />
              </DialogPrimitive.Close>
              <div className="max-h-[85vh] overflow-y-auto overscroll-contain px-5 pb-7 pt-5 md:px-7 md:pb-8 md:pt-6">
                {children}
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export default BookingDialog;
