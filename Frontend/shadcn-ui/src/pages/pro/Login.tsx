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

  // Verificación silenciosa de sesión remota (solo si el backend puede hacer /pros/me sin cookie)
  useQuery({
    queryKey: ['pros', 'me'],
    queryFn: api.prosMe,
    enabled: false,
    retry: false,
  });

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

  const isBusy = login.isPending;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-900/20 via-background to-blue-900/20 px-6">
      <div className="w-full max-w-md space-y-8">
        {/* Logo Badge */}
        <div className="flex justify-center">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-border/50 bg-card/50">
            <Scissors className="h-4 w-4" />
            <span className="text-sm font-semibold tracking-wider">PELUBOT PRO</span>
          </div>
        </div>

        {/* Title */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold">Inicia sesión</h1>
          <p className="text-muted-foreground text-pretty leading-relaxed">
            Accede a tu panel profesional para confirmar citas, reorganizar tu agenda y mantener la comunicación con tus clientes al día.
          </p>
        </div>

        {/* Login Card */}
        <Card className="bg-card border-border/50 rounded-xl p-8">
          <CardHeader className="space-y-2 p-0 mb-6">
            <CardTitle className="text-xl font-semibold text-center">Credenciales</CardTitle>
            <CardDescription className="text-sm text-center">
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
                      <FormLabel className="text-sm font-medium">Usuario o email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="ej. admin"
                          autoComplete="username"
                          disabled={isBusy}
                          className="h-11 bg-background"
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
                      <FormLabel className="text-sm font-medium">Contraseña</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          autoComplete="current-password"
                          disabled={isBusy}
                          className="h-11 bg-background"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="h-11 w-full"
                  disabled={isBusy}
                  size="lg"
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

      </div>
    </div>
  );
};

export default LoginPage;
