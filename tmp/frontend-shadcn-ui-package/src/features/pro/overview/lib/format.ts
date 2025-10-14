export const formatDate = (isoString: string | null | undefined) => {
  if (!isoString) return null;
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

export const formatHour = (iso: string | null | undefined) => {
  if (!iso) return '--:--';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return '--:--';
  return new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(dt);
};
