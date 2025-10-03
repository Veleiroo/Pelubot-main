import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useMemo } from 'react';
import { CalendarPlus, LogOut, Wand2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useProSession } from '@/store/pro';

const NAV_ITEMS = [
  { label: 'Resumen', to: '/pros' },
  { label: 'Agenda', to: '/pros/agenda', soon: true },
  { label: 'Clientes', to: '/pros/clientes', soon: true },
  { label: 'Estadísticas', to: '/pros/estadisticas', soon: true },
];

const ProsShell = () => {
  const location = useLocation();
  const { toast } = useToast();
  const { session } = useProSession();

  const activePath = useMemo(() => {
    const current = location.pathname.replace(/\/$/, '') || '/pros';
    return current.startsWith('/pros') ? current : '/pros';
  }, [location.pathname]);

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(130deg,rgba(16,185,129,0.18)_0%,rgba(15,118,110,0.06)_48%,rgba(15,23,42,0)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(210deg,rgba(59,130,246,0.12)_0%,rgba(15,23,42,0)_60%)] mix-blend-screen" />

      <header className="relative z-10 border-b border-white/10 bg-slate-950/60 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-6 sm:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3 text-sm text-white/70">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 font-semibold uppercase tracking-[0.28em] text-emerald-200">
                Pelubot Pro
              </div>
              {session?.stylist && (
                <span className="text-xs uppercase tracking-widest text-white/40">
                  {session.stylist.display_name ?? session.stylist.name}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                className="h-10 rounded-full border-emerald-400/60 px-4 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/10"
                onClick={() =>
                  toast({
                    title: 'Crear cita',
                    description: 'El calendario completo estará disponible pronto.',
                  })
                }
              >
                <CalendarPlus className="mr-2 h-4 w-4" aria-hidden="true" />
                Nueva cita
              </Button>
              <Button
                variant="ghost"
                className="h-10 rounded-full px-4 text-sm font-semibold text-white/70 hover:bg-white/10"
                onClick={() =>
                  toast({
                    title: 'Cerrar sesión',
                    description: 'Esta acción estará disponible en la próxima iteración.',
                  })
                }
              >
                <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                Salir
              </Button>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-2">
            {NAV_ITEMS.map((item) => {
              const normalized = item.to.replace(/\/$/, '') || '/pros';
              const isActive =
                normalized === '/pros'
                  ? activePath === '/pros'
                  : activePath.startsWith(normalized);

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`group inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 ${
                    isActive
                      ? 'bg-white/10 text-white shadow-[0_0_25px_rgba(16,185,129,0.15)]'
                      : 'border border-white/10 text-white/70 hover:border-white/30 hover:text-white'
                  }`}
                >
                  {item.label}
                  {item.soon && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-emerald-200">
                      <Wand2 className="h-3 w-3" aria-hidden="true" /> Pronto
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl px-6 py-10 sm:px-8">
        <Outlet />
      </main>
    </div>
  );
};

export default ProsShell;
