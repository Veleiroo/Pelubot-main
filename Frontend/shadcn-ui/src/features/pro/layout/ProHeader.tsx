import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Calendar, LogOut, Scissors } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProSession } from '@/store/pro';

const navItems = [
  { href: '/pros', label: 'Resumen' },
  { href: '/pros/agenda', label: 'Agenda' },
  { href: '/pros/clientes', label: 'Clientes' },
  { href: '/pros/estadisticas', label: 'Estadísticas' },
];

export function ProHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, clearSession } = useProSession();

  const handleLogout = () => {
    clearSession();
    navigate('/pros/login');
  };

  const handleNewAppointment = () => {
    // Esta función se puede implementar después para abrir un modal
    console.log('Abrir modal de nueva cita');
  };

  const stylistName = session?.stylist?.name || 'PROFESIONAL';

  return (
    <header className="border-b border-border/50 bg-background sticky top-0 z-50 backdrop-blur-sm bg-background/95">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo - stays on the left */}
          <Link to="/pros" className="flex items-center gap-2">
            <Scissors className="h-5 w-5 text-foreground" />
            <span className="font-bold text-lg">PELUBOT PRO</span>
            <span className="text-sm text-muted-foreground">• {stylistName.toUpperCase()}</span>
          </Link>

          {/* Navigation - centered */}
          <nav className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  location.pathname === item.href
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Actions - right side */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="bg-transparent hover:bg-secondary"
              onClick={handleNewAppointment}
            >
              <Calendar className="mr-2 h-4 w-4" />
              Nueva cita
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="hover:bg-secondary">
              <LogOut className="mr-2 h-4 w-4" />
              Salir
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
