import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, Scissors } from 'lucide-react';

import { api, ApiError, type StylistPublic } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useProSession } from '@/store/pro';

const loginSchema = z.object({
  identifier: z.string().min(2, 'Introduce tu usuario o email'),
  password: z.string().min(4, 'La contraseña debe tener al menos 4 caracteres'),
});

type LoginValues = z.infer<typeof loginSchema>;

const LoginPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const setSession = useProSession((state) => state.setSession);
  const currentSession = useProSession((state) => state.session);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: '',
      password: '',
    },
  });

  useEffect(() => {
    if (currentSession) {
      navigate('/pros', { replace: true });
    }
  }, [currentSession, navigate]);

  const checkSession = useQuery({
    queryKey: ['pros', 'me'],
    queryFn: api.prosMe,
    enabled: !currentSession,
    retry: false,
  });

  useEffect(() => {
    if (checkSession.data) {
      setSession({
        stylist: checkSession.data.stylist,
        sessionExpiresAt: checkSession.data.session_expires_at,
      });
      navigate('/pros', { replace: true });
    }
  }, [checkSession.data, navigate, setSession]);

  useEffect(() => {
    if (!checkSession.error) return;
    if (checkSession.error instanceof ApiError) {
      if (checkSession.error.status === 401) {
        return;
      }
      toast({
        title: 'Sin conexión con el portal',
        description: checkSession.error.message,
      });
      return;
    }
    toast({
      title: 'Sin conexión con el portal',
      description: 'No pudimos verificar tu sesión.',
    });
  }, [checkSession.error, toast]);

  const login = useMutation<{ stylist: StylistPublic; session_expires_at: string }, ApiError, LoginValues>({
    mutationFn: ({ identifier, password }) => api.prosLogin({ identifier, password }),
  });

  const onSubmit = async (values: LoginValues) => {
    form.clearErrors();
    try {
      const data = await login.mutateAsync(values);
      setSession({ stylist: data.stylist, sessionExpiresAt: data.session_expires_at });
      toast({
        title: `¡Hola ${data.stylist.display_name ?? data.stylist.name}!`,
        description: 'Has accedido correctamente al portal profesional.',
      });
      navigate('/pros', { replace: true });
    } catch (error) {
      const detail = error instanceof ApiError ? error.message : 'No se pudo iniciar sesión.';
      console.warn('setting form errors', detail);
      form.setError('identifier', { type: 'manual', message: 'Revisa tus datos.' });
      form.setError('password', { type: 'manual', message: detail });
      toast({
        title: 'Error al iniciar sesión',
        description: detail,
      });
    }
  };

  const isBusy = checkSession.isLoading || login.isPending;

  return (
    <div className="relative isolate flex min-h-screen flex-col overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(130deg,rgba(16,185,129,0.28)_0%,rgba(15,118,110,0.08)_45%,rgba(15,23,42,0)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(210deg,rgba(59,130,246,0.18)_0%,rgba(15,23,42,0)_55%)] mix-blend-screen" />

      <main className="relative z-10 mx-auto flex w-full flex-1 items-center justify-center px-6 py-16 sm:px-8">
        <div className="w-full max-w-md space-y-10">
          <div className="space-y-4 text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-emerald-200">
              <Scissors className="h-4 w-4" />
              <span className="text-sm font-semibold uppercase tracking-[0.28em]">Pelubot Pro</span>
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">Inicia sesión</h1>
              <p className="text-sm text-slate-300 sm:text-base">
                Accede a tu panel profesional para confirmar citas, reorganizar tu agenda y mantener la comunicación con tus clientes al día.
              </p>
            </div>
          </div>

          <Card className="rounded-2xl border border-white/10 bg-slate-950/70 p-8 ring-1 ring-white/10 shadow-2xl shadow-emerald-900/30 backdrop-blur-xl sm:p-10">
            <CardHeader className="space-y-3 text-center">
              <CardTitle className="text-lg font-semibold text-white">Credenciales</CardTitle>
              <CardDescription className="text-sm text-white/70">
                Introduce tus datos para continuar.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="identifier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-left text-sm font-medium text-white/80">Usuario o email</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="ej. admin"
                            autoComplete="username"
                            disabled={isBusy}
                            className="h-11 rounded-lg bg-white/5 text-white placeholder:text-white/50 ring-1 ring-white/10 transition focus-visible:outline-none focus-visible:ring-emerald-400/40"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-left text-sm font-medium text-white/80">Contraseña</FormLabel>
                        <FormControl>
                            <Input
                              type="password"
                              autoComplete="current-password"
                              disabled={isBusy}
                              className="h-11 rounded-lg bg-white/5 text-white placeholder:text-white/50 ring-1 ring-white/10 transition focus-visible:outline-none focus-visible:ring-emerald-400/40"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="h-11 w-full rounded-xl bg-emerald-600/20 text-emerald-300 ring-1 ring-emerald-400/30 transition hover:bg-emerald-600/25 hover:ring-emerald-400/50 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                    disabled={isBusy}
                  >
                    {isBusy ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Procesando...
                      </span>
                    ) : (
                      'Iniciar sesión'
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <div className="text-center text-xs text-white/60">
            <span className="text-white/50">¿Necesitas ayuda?</span>{' '}
            <a
              className="font-medium text-emerald-300 underline decoration-dotted underline-offset-4 transition hover:text-emerald-200"
              href="mailto:soporte@pelubot.com"
            >
              soporte@pelubot.com
            </a>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;
