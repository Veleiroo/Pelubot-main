const euroFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const euroWithDecimalsFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat('es-ES', {
  style: 'percent',
  maximumFractionDigits: 1,
});

export const formatEuro = (value: number, { withDecimals = false }: { withDecimals?: boolean } = {}) => {
  const safe = Number.isFinite(value) ? value : 0;
  return (withDecimals ? euroWithDecimalsFormatter : euroFormatter).format(safe);
};

export const formatPercent = (value: number) => {
  const safe = Number.isFinite(value) ? value / 100 : 0;
  return percentFormatter.format(safe);
};

export const formatChange = (value: number) => {
  const safe = Number.isFinite(value) ? value : 0;
  const prefix = safe > 0 ? '+' : '';
  return `${prefix}${formatPercent(safe)}`;
};

export const formatShare = (value: number) => {
  const safe = Number.isFinite(value) ? value : 0;
  return `${safe.toFixed(1)}%`;
};

export const pickTrend = (value: number): 'up' | 'down' | 'steady' => {
  if (value > 1) return 'up';
  if (value < -1) return 'down';
  return 'steady';
};
