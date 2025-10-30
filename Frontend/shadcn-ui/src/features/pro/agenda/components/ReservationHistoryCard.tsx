import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Service, ProReservation, ReservationStatus } from '@/lib/api';
import type { Appointment } from '../../shared/types';
import { useReservationHistory } from '../hooks/useReservationHistory';
import type { ReservationHistoryFilters } from '../hooks/useReservationHistory';

const STATUS_LABELS: Record<ReservationStatus, string> = {
  confirmada: 'Confirmada',
  asistida: 'Asistida',
  no_asistida: 'No asistió',
  cancelada: 'Cancelada',
};

const STATUS_BADGE_STYLES: Record<ReservationStatus, string> = {
  confirmada: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  asistida: 'bg-sky-500/15 text-sky-600 border-sky-500/30',
  no_asistida: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  cancelada: 'bg-rose-500/15 text-rose-600 border-rose-500/30',
};

const formatIsoDate = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return format(parsed, 'dd MMM yyyy', { locale: es });
};

const formatIsoTime = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return format(parsed, 'HH:mm', { locale: es });
};

const toAppointment = (reservation: ProReservation): Appointment => {
  const start = new Date(reservation.start);
  const end = reservation.end ? new Date(reservation.end) : null;
  return {
    id: reservation.id,
    date: format(start, 'yyyy-MM-dd'),
    time: formatIsoTime(reservation.start),
    endTime: reservation.end ? formatIsoTime(reservation.end) : undefined,
    client: reservation.customer_name ?? 'Cliente por confirmar',
    clientPhone: reservation.customer_phone ?? undefined,
    clientEmail: reservation.customer_email ?? undefined,
    service: reservation.service_name ?? reservation.service_id,
    serviceId: reservation.service_id,
    status: reservation.status,
    notes: reservation.notes ?? undefined,
  };
};

type ReservationHistoryCardProps = {
  services: Service[];
  onAction: (action: 'reschedule' | 'cancel', appointment: Appointment) => void;
  isRescheduling: boolean;
  isCancelling: boolean;
};

const DEFAULT_PAGE_SIZE = 20;

export const ReservationHistoryCard = ({
  services,
  onAction,
  isRescheduling,
  isCancelling,
}: ReservationHistoryCardProps) => {
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | 'all'>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>();
  const [dateTo, setDateTo] = useState<string>();
  const [page, setPage] = useState(1);

  const deferredSearch = useDeferredValue(searchInput);

  useEffect(() => {
    setPage(1);
  }, [deferredSearch, statusFilter, serviceFilter, dateFrom, dateTo]);

  const requestedPageSize = DEFAULT_PAGE_SIZE;

  const filters: ReservationHistoryFilters = useMemo(
    () => ({
      page,
      pageSize: requestedPageSize,
      search: deferredSearch || undefined,
      statuses: statusFilter === 'all' ? [] : [statusFilter],
      services: serviceFilter === 'all' ? [] : [serviceFilter],
      dateFrom,
      dateTo,
    }),
    [page, deferredSearch, statusFilter, serviceFilter, dateFrom, dateTo, requestedPageSize]
  );

  const { data, isLoading, isFetching } = useReservationHistory(filters);

  const total = data?.total ?? 0;
  const pageSize = data?.page_size ?? requestedPageSize;
  const hasNextPage = page * pageSize < total;
  const hasPrevPage = page > 1;

  const displayed = data?.items ?? [];
  const startIndex = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, total);
  const skeletonCount = filters.pageSize;

  return (
    <Card className="border-border/60 bg-card/50">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-xl">Historial de citas</CardTitle>
          <CardDescription>Busca y gestiona cualquier reserva pasada o futura desde un solo lugar.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-[minmax(0,300px)_minmax(0,200px)_minmax(0,200px)_minmax(0,200px)]">
          <div className="space-y-1.5">
            <Label htmlFor="history-search">Buscar</Label>
            <Input
              id="history-search"
              placeholder="Nombre, teléfono o ID de reserva"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Estado</Label>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ReservationStatus | 'all')}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Servicio</Label>
            <Select value={serviceFilter} onValueChange={(value) => setServiceFilter(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los servicios" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="history-from">Desde</Label>
              <Input
                id="history-from"
                type="date"
                value={dateFrom ?? ''}
                onChange={(event) => setDateFrom(event.target.value || undefined)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="history-to">Hasta</Label>
              <Input
                id="history-to"
                type="date"
                value={dateTo ?? ''}
                onChange={(event) => setDateTo(event.target.value || undefined)}
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border/50">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Cliente</TableHead>
                <TableHead>Servicio</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: skeletonCount }).map((_, index) => (
                  <TableRow key={`history-row-skeleton-${index}`}>
                    <TableCell className="text-muted-foreground/60">Cargando…</TableCell>
                    <TableCell />
                    <TableCell />
                    <TableCell />
                    <TableCell />
                    <TableCell className="text-right" />
                  </TableRow>
                ))
              ) : displayed.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No encontramos citas con los filtros seleccionados.
                  </TableCell>
                </TableRow>
              ) : (
                displayed.map((reservation) => {
                  const appointment = toAppointment(reservation);
                  return (
                    <TableRow key={reservation.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{reservation.customer_name ?? 'Cliente sin nombre'}</span>
                          <span className="text-xs text-muted-foreground">{reservation.id}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{reservation.service_name ?? reservation.service_id}</TableCell>
                      <TableCell>
                        <div className="flex flex-col text-sm text-muted-foreground">
                          <span>{formatIsoDate(reservation.start)}</span>
                          <span>{formatIsoTime(reservation.start)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{reservation.customer_phone ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_BADGE_STYLES[reservation.status]}>
                          {STATUS_LABELS[reservation.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="space-x-2 text-right">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="text-xs"
                          onClick={() => onAction('reschedule', appointment)}
                          disabled={isRescheduling}
                        >
                          Reprogramar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs text-destructive"
                          onClick={() => onAction('cancel', appointment)}
                          disabled={isCancelling}
                        >
                          Cancelar
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {startIndex}-{endIndex} de {total} resultados
            {isFetching ? ' · Actualizando…' : ''}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={!hasPrevPage || isFetching} onClick={() => setPage((value) => Math.max(1, value - 1))}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={!hasNextPage || isFetching} onClick={() => setPage((value) => value + 1)}>
              Siguiente
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
