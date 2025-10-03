import { useNavigate, useLocation } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { format, endOfMonth, startOfMonth } from 'date-fns';
import { api, Service as Svc } from '@/lib/api';
import { useBooking } from '@/store/booking';
import { toast } from '@/components/ui/sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { BookingSection } from '@/components/book/BookingSection';
import { ServiceCard } from '@/components/book/ServiceCard';
import { Scissors, Sparkles, LucideIcon, Crown, Zap, Brush } from '@/lib/icons';
import { BookingLayout } from '@/components/BookingLayout';
import { Button } from '@/components/ui/button';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { buildBookingState } from '@/lib/booking-route';

const Service = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const prefetched = useRef(new Set<string>());
  const useGcal = useMemo(() => {
    const v = (import.meta as unknown as { env: { VITE_USE_GCAL?: string | boolean } }).env?.VITE_USE_GCAL;
    return v === '1' || v === 'true' || v === true;
  }, []);

  const { setService, serviceId: selectedServiceId } = useBooking((s) => ({
    setService: s.setService,
    serviceId: s.serviceId,
  }));
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<Svc[], Error>({
    queryKey: ['services'],
    queryFn: api.getServices,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  useEffect(() => {
    if (error) {
      toast.error(error.message);
    }
  }, [error]);

  const services = data ?? [];

  const prefetchForService = useCallback((svcId: string) => {
    if (!svcId) return;
    if (prefetched.current.has(svcId)) return;
    const marker = svcId;
    prefetched.current.add(marker);

    const today = new Date();
    const monthKey = `${today.getFullYear()}-${today.getMonth()}`;
    const start = format(startOfMonth(today), 'yyyy-MM-dd');
    const end = format(endOfMonth(today), 'yyyy-MM-dd');

    const promises: Array<Promise<unknown>> = [
      queryClient.prefetchQuery({
        queryKey: ['professionals', svcId],
        queryFn: api.getProfessionals,
        staleTime: 60 * 1000,
        retry: 1,
      }),
      queryClient.prefetchQuery({
        queryKey: ['days-availability', svcId, monthKey, 'any', useGcal],
        queryFn: () =>
          api.getDaysAvailability({
            service_id: svcId,
            start,
            end,
            use_gcal: useGcal,
          }),
        staleTime: 30 * 1000,
        retry: 1,
      }),
    ];

    Promise.all(promises).catch(() => {
      prefetched.current.delete(marker);
    });
  }, [queryClient, useGcal]);

  if (isLoading)
    return (
      <BookingLayout title="Selecciona un servicio" subtitle="Elige el servicio que deseas reservar">
        <BookingSection title="Servicios disponibles">
          <div role="list" className="grid grid-cols-1 gap-4 md:gap-6 auto-rows-fr sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
                <div className="flex h-full flex-col justify-between gap-4">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-12 w-12 rounded-xl" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-4 w-28" />
                    </div>
                  </div>
                  <Skeleton className="h-9 w-full rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        </BookingSection>
      </BookingLayout>
    );

  if (isError)
    return (
      <BookingLayout title="Selecciona un servicio" subtitle="Elige el servicio que deseas reservar">
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 mb-4">
            <Zap className="h-6 w-6 text-red-400" />
          </div>
          <div className="text-red-400 text-sm font-medium">{error?.message ?? 'Error cargando servicios'}</div>
          <Button className="mt-4" onClick={() => refetch()}>Reintentar</Button>
        </div>
      </BookingLayout>
    );

  const onSelect = (svc: Svc) => {
    prefetchForService(svc.id);
    setService(svc.id, svc.name);
    // Pasamos el servicio en la URL para evitar cualquier condición de carrera del store.
    navigate(`/book/date?service=${encodeURIComponent(svc.id)}`, { state: buildBookingState(location) });
  };

  const iconMap: Record<string, LucideIcon> = {
    corte_cabello: Scissors,
    corte_barba: Sparkles,
    arreglo_barba: Brush,
    corte_jubilado: Crown,
  };

  return (
    <BookingLayout title="Selecciona un servicio" subtitle="Elige el servicio que deseas reservar">
      <div className="grid grid-cols-1 gap-4 md:gap-6 auto-rows-fr sm:grid-cols-3">
        {services.map((s) => (
          <ServiceCard
            key={s.id}
            title={s.name}
            duration={`${s.duration_min} minutos`}
            price={`${s.price_eur} €`}
            icon={iconMap[s.id] ?? Scissors}
            onSelect={() => onSelect(s)}
            attrsId={`svc-${s.id}`}
            selected={selectedServiceId === s.id}
            onPreview={() => prefetchForService(s.id)}
          />
        ))}
      </div>
    </BookingLayout>
  );
};

export default Service;
