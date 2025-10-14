import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { useToast } from '@/hooks/use-toast';
import { useProSession } from '@/store/pro';

import { AppointmentsCard } from './components/appointments-card';
import { SummaryCard } from './components/summary-card';
import { UpcomingCard } from './components/upcoming-card';
import { useOverviewData } from './hooks/useOverviewData';
import type { AppointmentActionType } from './types';

export const ProsOverviewView = () => {
  const { toast } = useToast();
  const { session } = useProSession();
  const layoutRef = useRef<HTMLDivElement>(null);
  const topSectionRef = useRef<HTMLElement>(null);
  const [appointmentsCardHeight, setAppointmentsCardHeight] = useState<number | null>(null);

  const stylist = session?.stylist;
  const {
    appointments,
    upcomingAppointment,
    summary,
    isInitialOverviewLoading,
    overviewErrorMessage,
  } = useOverviewData(Boolean(stylist));

  const handleAppointmentAction = useCallback(
    (action: AppointmentActionType, detail?: string) => {
      const labels: Record<AppointmentActionType, string> = {
        attended: 'Marcada como asistida',
        'no-show': 'Marcada como no asistida',
        reschedule: 'Abriremos la reprogramación pronto',
      };
      toast({
        title: labels[action],
        description: detail ?? 'Prototipo temporal: los cambios se guardarán en una próxima iteración.',
      });
    },
    [toast]
  );

  const openAppointmentDetail = useCallback(
    (id: string) => {
      toast({
        title: 'Detalle en construcción',
        description: `Abriremos la cita ${id} en breve.`,
      });
    },
    [toast]
  );

  useLayoutEffect(() => {
    const updateAppointmentsCardHeight = () => {
      const layoutNode = layoutRef.current;
      if (!layoutNode) return;

      const isDesktop = window.innerWidth >= 1024;
      if (!isDesktop) {
        setAppointmentsCardHeight(null);
        return;
      }

      const layoutRect = layoutNode.getBoundingClientRect();
      const topHeight = topSectionRef.current?.getBoundingClientRect().height ?? 0;
      const styles = window.getComputedStyle(layoutNode);
      const gap = parseFloat(styles.rowGap || styles.gap || '0');
      const viewport = window.innerHeight;
      const offsetTop = layoutRect.top;
      const desiredBottomGap = Math.max(offsetTop, 32);
      const available = viewport - offsetTop - topHeight - gap - desiredBottomGap;

      if (!Number.isFinite(available) || available <= 0) {
        setAppointmentsCardHeight(null);
        return;
      }

      const minHeight = 360;
      if (available < minHeight) {
        setAppointmentsCardHeight(null);
        return;
      }

      setAppointmentsCardHeight(Math.round(available));
    };

    updateAppointmentsCardHeight();
    window.addEventListener('resize', updateAppointmentsCardHeight);
    return () => window.removeEventListener('resize', updateAppointmentsCardHeight);
  }, []);

  if (!stylist) {
    return (
      <div className="flex min-h-[320px] items-center justify-center text-sm text-white/70">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Cargando portal...
      </div>
    );
  }

  return (
    <div ref={layoutRef} className="flex flex-col gap-4">
      <section ref={topSectionRef} className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <UpcomingCard
          appointment={upcomingAppointment}
          isLoading={isInitialOverviewLoading}
          errorMessage={overviewErrorMessage}
          onAction={handleAppointmentAction}
        />
        <SummaryCard summary={summary} isLoading={isInitialOverviewLoading} />
      </section>

      <section className="flex flex-col min-h-0">
        <AppointmentsCard
          appointments={appointments}
          summary={summary}
          isLoading={isInitialOverviewLoading}
          errorMessage={overviewErrorMessage}
          height={appointmentsCardHeight}
          onSelectAppointment={openAppointmentDetail}
        />
      </section>
    </div>
  );
};

export default ProsOverviewView;
