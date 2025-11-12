import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { api, ApiError, type StylistPublic } from '@/lib/api';
import { useProSession } from '@/store/pro';

import { ProsHeader } from './ProsHeader';

type ProsSessionResponse = Awaited<ReturnType<typeof api.prosMe>>;

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

  const sessionQuery = useQuery<ProsSessionResponse, ApiError>({
    queryKey: ['pros', 'me'],
    queryFn: api.prosMe,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  useEffect(() => {
    const data = sessionQuery.data;
    if (!data) return;
    const { stylist, session_expires_at, session_token } = data;
    if (!session || session.stylist.id !== stylist.id || session.sessionExpiresAt !== session_expires_at || session.sessionToken !== session_token) {
      setSession({
        stylist,
        sessionExpiresAt: session_expires_at,
        sessionToken: session_token ?? session?.sessionToken ?? null,
      });
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

  const stylistDisplayName = session.stylist.display_name ?? session.stylist.name ?? null;

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      <ProsHeader
        stylistDisplayName={stylistDisplayName}
        onCreateAppointment={() => navigate('/pros/agenda', { state: { newAppointment: true } })}
        onLogout={() => logout.mutate()}
        isLogoutPending={logout.isPending}
      />
      <main className="flex-1 py-6 sm:py-8">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default ProsShell;
