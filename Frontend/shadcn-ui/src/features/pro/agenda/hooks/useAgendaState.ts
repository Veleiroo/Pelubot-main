import { useEffect, useMemo, useState } from 'react';
import { addMonths, format, parseISO, startOfDay, startOfMonth } from 'date-fns';

import type { Appointment } from '../../shared/types';
import {
  buildAgendaCollections,
  ensureMonth,
  formatAgendaDayLabel,
  getAgendaMonthBounds,
  normalizeDay,
  summarizeAppointments,
} from '../lib/agenda-helpers';

export const useAgendaState = (appointments: Appointment[]) => {
  const collections = useMemo(() => buildAgendaCollections(appointments), [appointments]);
  const { appointmentsByDate, busyDates, sortedDates } = collections;

  const today = useMemo(() => startOfDay(new Date()), []);

  const derivedSelectedDate = useMemo(() => {
    const todayKey = format(today, 'yyyy-MM-dd');
    if (appointmentsByDate[todayKey]?.length) return today;
    if (sortedDates.length > 0) return startOfDay(parseISO(sortedDates[0]));
    return today;
  }, [appointmentsByDate, sortedDates, today]);

  const [selectedDate, setSelectedDate] = useState<Date>(derivedSelectedDate);
  const [currentMonth, setCurrentMonth] = useState<Date>(() => startOfMonth(derivedSelectedDate));

  useEffect(() => {
    setSelectedDate(derivedSelectedDate);
    setCurrentMonth(startOfMonth(derivedSelectedDate));
  }, [derivedSelectedDate]);

  const selectedKey = useMemo(() => format(selectedDate, 'yyyy-MM-dd'), [selectedDate]);
  const selectedAppointments = useMemo(
    () => appointmentsByDate[selectedKey] ?? [],
    [appointmentsByDate, selectedKey]
  );

  const summary = useMemo(() => summarizeAppointments(selectedAppointments), [selectedAppointments]);
  const dayLabel = useMemo(() => formatAgendaDayLabel(selectedDate), [selectedDate]);

  const handleSelectDay = (day?: Date) => {
    const normalized = normalizeDay(day);
    if (!normalized) return;
    setSelectedDate(normalized);
    setCurrentMonth(startOfMonth(normalized));
  };

  const handleMonthChange = (nextMonth: Date) => {
    setCurrentMonth(startOfMonth(nextMonth));
  };

  const goToMonth = (target: Date) => {
    setCurrentMonth(startOfMonth(target));
  };

  const previousMonthCandidate = useMemo(() => ensureMonth(addMonths(currentMonth, -1)), [currentMonth]);
  const nextMonthCandidate = useMemo(() => ensureMonth(addMonths(currentMonth, 1)), [currentMonth]);
  const { fromMonth, toMonth } = useMemo(() => getAgendaMonthBounds(), []);

  const disablePrevNav = previousMonthCandidate < fromMonth;
  const disableNextNav = nextMonthCandidate > toMonth;

  return {
    appointmentsByDate,
    busyDates,
    selectedAppointments,
    summary,
    dayLabel,
    today,
    selectedDate,
    currentMonth,
    fromMonth,
    toMonth,
    disablePrevNav,
    disableNextNav,
    previousMonthCandidate,
    nextMonthCandidate,
    handleSelectDay,
    handleMonthChange,
    goToMonth,
    setCurrentMonth,
  };
};
