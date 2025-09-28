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
            'pointer-events-none fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-3 pb-6 pt-[5vh] text-sm outline-none',
            'md:px-5 md:pt-[8vh]'
          )}
          style={{ pointerEvents: 'none' }}
          onPointerDownOutside={(event) => {
            event.preventDefault();
            handleOpenChange(false);
          }}
          onEscapeKeyDown={(event) => {
            event.preventDefault();
            handleOpenChange(false);
          }}
        >
          <div className="pointer-events-auto relative mx-auto w-full max-w-[920px] max-h-[85vh] overflow-y-auto overscroll-contain rounded-2xl border border-zinc-800 bg-zinc-900 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.75)]">
            <DialogPrimitive.Close
              className="absolute right-5 top-5 inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700/70 bg-zinc-900/90 text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
              aria-label="Cerrar reserva"
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
            <div className="px-5 pb-6 pt-14 md:px-6 md:pb-7">{children}</div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export default BookingDialog;
