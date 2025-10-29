import { NavLink, useLocation } from 'react-router-dom';
import { Calendar, Loader2, LogOut, Scissors } from 'lucide-react';

import { Button } from '@/components/ui/button';
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

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur">
      <div className="flex h-16 w-full items-center px-4 sm:px-6">
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
            {PROS_NAV_ITEMS.map((item) => {
              const normalized = item.to.replace(/\/$/, '') || '/pros';
              const isActive =
                normalized === '/pros'
                  ? activePath === '/pros'
                  : activePath.startsWith(normalized);

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={cn(
                    'px-5 py-2 text-base font-medium transition-colors rounded-lg',
                    isActive
                      ? 'bg-secondary text-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                  )}
                >
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="flex flex-1 items-center justify-end gap-3">
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
