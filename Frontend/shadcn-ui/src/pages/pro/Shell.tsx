import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CalendarPlus, Loader2, LogOut, Wand2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { api, ApiError, StylistPublic } from '@/lib/api';
import { useProSession } from '@/store/pro';

const NAV_ITEMS = [
  { label: 'Resumen', to: '/pros' },
  { label: 'Agenda', to: '/pros/agenda', soon: true },
  { label: 'Clientes', to: '/pros/clientes', soon: true },
  { label: 'Estadísticas', to: '/pros/estadisticas', soon: true },
];

const ProsShell = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session, setSession, clearSession } = useProSession();
  const redirectingRef = useRef(false);

  const sessionQuery = useQuery<{ stylist: StylistPublic; session_expires_at: string }, ApiError>({
    queryKey: ['pros', 'me'],
    queryFn: api.prosMe,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  useEffect(() => {
    const data = sessionQuery.data;
    if (!data) return;
    const { stylist, session_expires_at } = data;
    if (!session || session.stylist.id !== stylist.id || session.sessionExpiresAt !== session_expires_at) {
      setSession({ stylist, sessionExpiresAt: session_expires_at });
    }
  }, [sessionQuery.data, session, setSession]);

  useEffect(() => {
    const error = sessionQuery.error;
    if (!error) return;
    if (error.status === 401) {
      clearSession();
      return;
    }
    toast({
      title: 'No pudimos verificar tu sesión',
      description: error.message,
    });
  }, [sessionQuery.error, clearSession, toast]);

  const logout = useMutation({
    mutationFn: api.prosLogout,
    onSuccess: () => {
      clearSession();
      toast({ title: 'Sesión cerrada' });
      navigate('/pros/login', { replace: true });
    },
    onError: (error: unknown) => {
      const detail = error instanceof ApiError ? error.message : 'No se pudo cerrar sesión.';
      toast({
        title: 'Error al cerrar sesión',
        description: detail,
      });
    },
  });

  useEffect(() => {
    if (session?.stylist) {
      redirectingRef.current = false;
    }
  }, [session?.stylist]);

  const isCheckingSession = sessionQuery.isLoading && !session?.stylist;
  const sessionError = sessionQuery.error ?? null;
  const sessionErrorStatus = sessionError?.status;
  const sessionErrorMessage = sessionError?.message ?? '';

  useEffect(() => {
    if (session?.stylist) return;
    if (sessionErrorStatus !== 401) return;
    if (redirectingRef.current) return;

    redirectingRef.current = true;
    navigate('/pros/login', {
      replace: true,
      state: {
        from: location.pathname.startsWith('/pros') ? location.pathname : '/pros',
      },
    });
  }, [session?.stylist, sessionErrorStatus, navigate, location.pathname]);

  if (!session?.stylist) {
    if (sessionErrorStatus === 401) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white/70">
          <div className="flex flex-col items-center gap-2 text-center text-sm">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            Redirigiéndote al acceso profesional...
          </div>
        </div>
      );
    }

    if (isCheckingSession) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white/70">
          <div className="flex items-center gap-3 text-sm">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            Verificando tu sesión...
          </div>
        </div>
      );
    }

    if (sessionError && sessionErrorStatus !== 401) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 text-center text-white/70">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-white">No pudimos entrar al portal</p>
            <p className="text-sm text-white/60">{sessionErrorMessage}</p>
          </div>
          <Button
            variant="outline"
            className="rounded-full border-emerald-400/60 text-emerald-200 hover:bg-emerald-500/10"
            onClick={() => sessionQuery.refetch()}
          >
            Reintentar
          </Button>
        </div>
      );
    }

    return null;
  }

  const normalizedPath = location.pathname.replace(/\/$/, '') || '/pros';
  const activePath = normalizedPath.startsWith('/pros') ? normalizedPath : '/pros';

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(130deg,rgba(16,185,129,0.18)_0%,rgba(15,118,110,0.06)_48%,rgba(15,23,42,0)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(210deg,rgba(59,130,246,0.12)_0%,rgba(15,23,42,0)_60%)] mix-blend-screen" />

      <header className="relative z-10 border-b border-white/10 bg-slate-950/60 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-6xl px-6 py-4 sm:px-8">
          <div className="flex flex-wrap items-center gap-3 md:flex-nowrap">
            <div className="flex shrink-0 items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-white/40">
              <span className="font-semibold text-emerald-200/80">Pelubot Pro</span>
              {session?.stylist && (
                <span className="hidden text-white/30 md:inline">• {session.stylist.display_name ?? session.stylist.name}</span>
              )}
            </div>

            <nav className="order-3 flex w-full flex-wrap items-center justify-center gap-2 md:order-none md:flex-1 md:flex-nowrap">
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

            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
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
                disabled={logout.isPending}
                onClick={() => logout.mutate()}
              >
                {logout.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                )}
                Salir
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl px-6 py-10 sm:px-8">
        <Outlet />
      </main>
    </div>
  );
};

export default ProsShell;
