import { NavLink, useLocation } from 'react-router-dom';
import { Calendar, Loader2, LogOut, Menu, Scissors } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { PROS_NAV_ITEMS } from './nav';

type ProsHeaderProps = {
  stylistDisplayName?: string | null;
  onCreateAppointment: () => void;
  onLogout: () => void;
  isLogoutPending?: boolean;
};

export const ProsHeader = ({
  stylistDisplayName,
  onCreateAppointment,
  onLogout,
  isLogoutPending = false,
}: ProsHeaderProps) => {
  const location = useLocation();
  const normalizedPath = location.pathname.replace(/\/$/, '') || '/pros';
  const activePath = normalizedPath.startsWith('/pros') ? normalizedPath : '/pros';

  const renderNavLink = (item: (typeof PROS_NAV_ITEMS)[number], variant: 'desktop' | 'mobile') => {
    const normalized = item.to.replace(/\/$/, '') || '/pros';
    const isActive = normalized === '/pros' ? activePath === '/pros' : activePath.startsWith(normalized);

    const classes = cn(
      'rounded-lg font-medium transition-colors',
      variant === 'desktop' ? 'px-5 py-2 text-base' : 'px-4 py-3 text-lg',
      isActive ? 'bg-secondary text-foreground shadow-sm' : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
    );

    if (variant === 'mobile') {
      return (
        <SheetClose asChild key={item.to}>
          <NavLink to={item.to} className={classes}>
            {item.label}
          </NavLink>
        </SheetClose>
      );
    }

    return (
      <NavLink key={item.to} to={item.to} className={classes}>
        {item.label}
      </NavLink>
    );
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur">
      <div className="flex h-16 w-full items-center gap-3 px-4 sm:px-6">
        <div className="flex flex-1 items-center justify-start">
          <NavLink
            to="/pros"
            className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground transition hover:text-foreground"
          >
            <Scissors className="h-5 w-5 text-foreground" aria-hidden="true" />
            <span className="text-base font-bold text-foreground">Pelubot Pro</span>
            {stylistDisplayName ? (
              <span className="hidden text-sm font-medium text-muted-foreground md:inline">
                • {stylistDisplayName}
              </span>
            ) : null}
          </NavLink>
        </div>

        <div className="hidden flex-1 items-center justify-center md:flex">
          <nav className="flex items-center gap-2">
            {PROS_NAV_ITEMS.map((item) => renderNavLink(item, 'desktop'))}
          </nav>
        </div>

        <div className="flex flex-1 items-center justify-end gap-3">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="inline-flex h-10 items-center gap-2 rounded-md border-border/60 bg-transparent text-base font-semibold text-foreground transition hover:bg-secondary md:hidden"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
                Menú
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-full max-w-xs border-r border-border/60 p-0">
              <SheetHeader className="border-b border-border/60 px-6 py-4 text-left">
                <SheetTitle className="text-xl font-semibold text-foreground">Pelubot Pro</SheetTitle>
              </SheetHeader>
              <div className="flex flex-1 flex-col gap-4 px-4 py-6">
                <nav className="flex flex-col gap-2">
                  {PROS_NAV_ITEMS.map((item) => renderNavLink(item, 'mobile'))}
                </nav>
                <div className="flex flex-col gap-2">
                  <SheetClose asChild>
                    <Button
                      variant="outline"
                      className="h-11 w-full items-center gap-3 rounded-md border-border/60 text-base font-semibold"
                      onClick={onCreateAppointment}
                    >
                      <Calendar className="h-5 w-5" aria-hidden="true" />
                      Nueva cita
                    </Button>
                  </SheetClose>
                  <Button
                    variant="ghost"
                    className="h-11 w-full justify-center rounded-md text-base font-semibold text-muted-foreground transition hover:text-foreground"
                    onClick={onLogout}
                    disabled={isLogoutPending}
                  >
                    {isLogoutPending ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
                    ) : (
                      <LogOut className="mr-2 h-5 w-5" aria-hidden="true" />
                    )}
                    Salir
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <Button
            variant="outline"
            size="sm"
            className="hidden h-10 items-center gap-3 rounded-md border-border/60 bg-transparent text-base font-semibold text-foreground transition hover:bg-secondary md:inline-flex"
            onClick={onCreateAppointment}
          >
            <Calendar className="h-5 w-5" aria-hidden="true" />
            Nueva cita
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-10 rounded-md px-4 text-base font-semibold text-muted-foreground transition hover:text-foreground"
            onClick={onLogout}
            disabled={isLogoutPending}
          >
            {isLogoutPending ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
            ) : (
              <LogOut className="mr-2 h-5 w-5" aria-hidden="true" />
            )}
            Salir
          </Button>
        </div>
      </div>
    </header>
  );
};

export default ProsHeader;
