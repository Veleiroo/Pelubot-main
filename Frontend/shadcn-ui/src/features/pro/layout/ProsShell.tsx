import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarPlus, Loader2, LogOut, Wand2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { api, ApiError, type StylistPublic } from '@/lib/api';
import { useProSession } from '@/store/pro';

import { PROS_NAV_ITEMS } from './nav';

export const ProsShell = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session, setSession, clearSession } = useProSession();
  const redirectingRef = useRef(false);
  const queryClient = useQueryClient();

  const resetProSession = useCallback(() => {
    void queryClient.cancelQueries({ queryKey: ['pros'], exact: false });
    queryClient.removeQueries({ queryKey: ['pros'], exact: false });
    clearSession();
  }, [clearSession, queryClient]);

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
      resetProSession();
      return;
    }
    toast({
      title: 'No pudimos verificar tu sesión',
      description: error.message,
    });
  }, [sessionQuery.error, resetProSession, toast]);

  const logout = useMutation({
    mutationFn: api.prosLogout,
    onSuccess: () => {
      resetProSession();
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
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border/50 bg-card">
        <div className="container flex h-16 items-center gap-4">
          <div className="flex shrink-0 items-center gap-2 text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
            <span className="text-sm font-semibold text-foreground">Pelubot Pro</span>
            {session?.stylist && (
              <span className="hidden text-muted-foreground/80 md:inline">
                • {session.stylist.display_name ?? session.stylist.name}
              </span>
            )}
          </div>

          <nav className="flex flex-1 items-center justify-center gap-2">
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
                  className={`group inline-flex h-9 items-center gap-2 rounded-md border border-border/50 px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                    isActive
                      ? 'bg-muted text-foreground'
                      : 'bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {item.label}
                  {item.soon && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-foreground">
                      <Wand2 className="h-3 w-3" aria-hidden="true" /> Pronto
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              className="h-9 rounded-md border-border/50 bg-card px-4 text-sm font-semibold text-foreground hover:bg-muted"
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
              className="h-9 rounded-md px-4 text-sm font-semibold text-muted-foreground hover:bg-muted"
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
      </header>

      <main className="flex-1 py-10">
        <div className="container">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default ProsShell;
