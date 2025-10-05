import type { AgendaSummary, Appointment } from '../shared/types';

export type AgendaCalendarCardProps = {
  selectedDate: Date;
  currentMonth: Date;
  today: Date;
  busyDates: Date[];
  fromMonth: Date;
  toMonth: Date;
  title?: string;
  description?: string;
  disablePrev?: boolean;
  disableNext?: boolean;
  onSelectDay: (day?: Date) => void;
  onMonthChange: (month: Date) => void;
  onPrev: () => void;
  onNext: () => void;
};

export type AgendaAppointmentsCardProps = {
  dayLabel: string;
  summary: AgendaSummary;
  appointments: Appointment[];
  onCreate: () => void;
  onAction: (action: 'reschedule' | 'cancel', appointment: Appointment) => void;
  minHeight: number;
  height?: number | null;
};
