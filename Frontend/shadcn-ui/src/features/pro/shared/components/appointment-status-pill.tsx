import { cn } from '@/lib/utils';

import { STATUS_ACCENTS, STATUS_LABELS } from '../constants';
import type { AppointmentStatus } from '../types';

export type AppointmentStatusPillProps = {
  status: AppointmentStatus;
  className?: string;
  labelClassName?: string;
  dotClassName?: string;
};

export const AppointmentStatusPill = ({
  status,
  className,
  labelClassName,
  dotClassName,
}: AppointmentStatusPillProps) => {
  const config = STATUS_ACCENTS[status] ?? STATUS_ACCENTS.confirmada;

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', config.dot, dotClassName)} />
      <span className={cn(config.text, labelClassName)}>{STATUS_LABELS[status]}</span>
    </span>
  );
};

export default AppointmentStatusPill;
