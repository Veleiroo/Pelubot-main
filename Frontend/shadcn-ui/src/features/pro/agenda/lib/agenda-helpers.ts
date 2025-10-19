import { addMonths, compareAsc, format, parseISO, startOfDay, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

import type { AgendaSummary, Appointment, AppointmentsByDate } from '../../shared/types';

export type AgendaCollections = {
  appointmentsByDate: AppointmentsByDate;
  busyDates: Date[];
  sortedDates: string[];
};

export const buildAgendaCollections = (appointments: Appointment[]): AgendaCollections => {
  const sorted = [...appointments].sort((a, b) => {
    const dateCompare = compareAsc(parseISO(a.date), parseISO(b.date));
    if (dateCompare !== 0) return dateCompare;
    return a.time.localeCompare(b.time);
  });

  const byDate: AppointmentsByDate = {};
  for (const appointment of sorted) {
    if (!byDate[appointment.date]) byDate[appointment.date] = [];
    byDate[appointment.date].push(appointment);
  }

  const dates = Object.keys(byDate).sort();
  const busyDates = dates.map((iso) => startOfDay(parseISO(iso)));

  return { appointmentsByDate: byDate, busyDates, sortedDates: dates };
};

export const summarizeAppointments = (appointments: Appointment[]): AgendaSummary => {
  const summary: AgendaSummary = {
    total: appointments.length,
    confirmadas: 0,
    asistidas: 0,
    no_asistidas: 0,
    canceladas: 0,
  };

  for (const appointment of appointments) {
    if (appointment.status === 'confirmada') summary.confirmadas += 1;
    else if (appointment.status === 'asistida') summary.asistidas += 1;
    else if (appointment.status === 'no_asistida') summary.no_asistidas += 1;
    else if (appointment.status === 'cancelada') summary.canceladas += 1;
  }

  return summary;
};

export const formatAgendaDayLabel = (date: Date) =>
  format(date, "EEEE d 'de' MMMM", { locale: es });

export const getAgendaMonthBounds = () => {
  const base = startOfMonth(new Date());
  return {
    fromMonth: addMonths(base, -3),
    toMonth: addMonths(base, 6),
  };
};

export const normalizeDay = (day: Date | undefined) => (day ? startOfDay(day) : undefined);

export const ensureMonth = (month: Date) => startOfMonth(month);
