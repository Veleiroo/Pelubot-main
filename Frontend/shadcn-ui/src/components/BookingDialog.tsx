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
            'fixed inset-0 z-50 flex items-start justify-center overflow-y-hidden px-4 py-6 text-sm outline-none',
            'md:px-6 md:py-10',
            'dark'
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
            <div className="relative flex w-full max-h-[calc(100vh-48px)] flex-col overflow-hidden rounded-3xl border border-white/12 bg-background shadow-[0_50px_140px_-55px_rgba(0,0,0,0.85)] md:max-h-[calc(100vh-80px)]">
              <DialogPrimitive.Close
                className="absolute right-6 top-5 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-background/90 text-white/70 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background md:top-6"
                aria-label="Cerrar reserva"
              >
                <X className="h-4 w-4" />
              </DialogPrimitive.Close>
              <div className="flex-1 overflow-y-auto overscroll-contain bg-background px-5 pb-7 pt-5 md:px-7 md:pb-8 md:pt-6">
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
