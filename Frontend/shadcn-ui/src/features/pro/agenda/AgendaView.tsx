import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { Loader2 } from 'lucide-react';

import { useToast } from '@/hooks/use-toast';
import { useProSession } from '@/store/pro';

import { useAgendaData } from './hooks/useAgendaData';
import { useAgendaActions } from './hooks/useAgendaActions';
import { AgendaCalendar } from './components/AgendaCalendar';
import { AgendaAppointments } from './components/AgendaAppointments';

export const ProsAgendaView = () => {
  const { toast } = useToast();
  const { session } = useProSession();
  const [selectedDate, setSelectedDate] = useState(new Date());

  const stylist = session?.stylist;

  const { appointments, isLoading, errorMessage, refetch } = useAgendaData(Boolean(stylist));

  const {
    cancelAppointment,
    isCancelling,
  } = useAgendaActions({ professionalId: stylist?.id });

  // Filter appointments for selected date
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const dayAppointments = useMemo(() => {
    return appointments.filter((apt) => apt.date === selectedDateStr);
  }, [appointments, selectedDateStr]);

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
  };

  const handleCreateAppointment = () => {
    toast({
      title: 'Crear cita',
      description: 'El formulario de creación estará disponible pronto.',
    });
  };

  const handleRescheduleAppointment = (id: string) => {
    toast({
      title: 'Reprogramar cita',
      description: 'La funcionalidad de reprogramación estará disponible pronto.',
    });
  };

  const handleCancelAppointment = async (id: string) => {
    try {
      await cancelAppointment({ reservationId: id });
      toast({
        title: 'Cita cancelada',
        description: 'La cita se ha cancelado correctamente.',
      });
    } catch (error) {
      toast({
        title: 'Error al cancelar',
        description: 'No se pudo cancelar la cita. Inténtalo de nuevo.',
        variant: 'destructive',
      });
    }
  };

  if (!stylist) {
    return (
      <section className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="text-sm">Cargando tu agenda...</p>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="text-sm">Cargando citas...</p>
      </section>
    );
  }

  if (errorMessage) {
    return (
      <section className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-destructive">
        <p className="text-sm">Error al cargar las citas: {errorMessage}</p>
      </section>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(350px,420px)_1fr] gap-6 min-h-[calc(100vh-10rem)]">
      <div className="xl:sticky xl:top-6 xl:self-start h-fit">
        <AgendaCalendar
          appointments={appointments}
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
        />
      </div>
      <div className="flex flex-col min-h-[600px] xl:min-h-[calc(100vh-10rem)]">
        <AgendaAppointments
          appointments={dayAppointments}
          selectedDate={selectedDate}
          onCreateAppointment={handleCreateAppointment}
          onRescheduleAppointment={handleRescheduleAppointment}
          onCancelAppointment={handleCancelAppointment}
        />
      </div>
    </div>
  );
};

export default ProsAgendaView;
