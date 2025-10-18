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
      <div className="container relative flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
        <NavLink
          to="/pros"
          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground transition hover:text-foreground"
        >
          <Scissors className="h-4 w-4 text-foreground" aria-hidden="true" />
          <span className="text-sm font-bold text-foreground">Pelubot Pro</span>
          {stylistDisplayName ? (
            <span className="hidden text-xs font-medium text-muted-foreground md:inline">
              • {stylistDisplayName}
            </span>
          ) : null}
        </NavLink>

        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex">
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
                  'px-4 py-2 text-sm font-medium transition-colors rounded-lg',
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

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="hidden h-9 items-center gap-2 rounded-md border-border/60 bg-transparent text-sm font-semibold text-foreground transition hover:bg-secondary md:inline-flex"
            onClick={onCreateAppointment}
          >
            <Calendar className="h-4 w-4" aria-hidden="true" />
            Nueva cita
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 rounded-md px-3 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
            onClick={onLogout}
            disabled={isLogoutPending}
          >
            {isLogoutPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            Salir
          </Button>
        </div>
      </div>
    </header>
  );
};

export default ProsHeader;
