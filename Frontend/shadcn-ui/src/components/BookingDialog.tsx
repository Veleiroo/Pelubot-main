import { ReactNode } from 'react';
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

  return (
    <DialogPrimitive.Root open onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm supports-[backdrop-filter]:backdrop-blur-sm" />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[min(100vw,880px)] max-h-[85vh] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-2xl border border-white/10 bg-neutral-900/95 p-5 text-sm shadow-xl md:p-6'
          )}
        >
          <DialogPrimitive.Close
            className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-background/80 text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Cerrar reserva"
          >
            <X className="h-4 w-4" />
          </DialogPrimitive.Close>
          <div className="max-h-[90vh] overflow-y-auto px-4 pb-6 pt-10 sm:px-6">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export default BookingDialog;
