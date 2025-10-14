import { Info } from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { CLIENT_STATUS_BADGE, CLIENT_STATUS_LABELS } from '../constants';
import { formatEuro } from '../lib/format';
import type { ClientRow } from '../types';

type ClientTableProps = {
  clients: ClientRow[];
  isLoading: boolean;
  errorMessage: string | null;
  onImportClick: () => void;
  onRefreshClick: () => void;
};

export const ClientsTable = ({ clients, isLoading, errorMessage, onImportClick, onRefreshClick }: ClientTableProps) => {
  return (
    <Card className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-sm backdrop-blur">
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="text-lg font-semibold text-white">Directorio de clientes</CardTitle>
          <CardDescription className="text-sm text-white/60">
            Explora el histórico, contacto y próximos pasos. Pronto podrás filtrar y editar cada ficha.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-white/70 hover:text-white" onClick={onRefreshClick}>
            Actualizar
          </Button>
          <Button variant="secondary" className="bg-white/15 text-white hover:bg-white/25" onClick={onImportClick}>
            Importar clientes (pronto)
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center text-sm text-white/70">
            Cargando directorio...
          </div>
        ) : errorMessage ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 px-6 text-center text-sm text-rose-100">
            <Info className="h-5 w-5" />
            <p>{errorMessage}</p>
          </div>
        ) : clients.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 px-6 text-center text-sm text-white/70">
            <p className="max-w-md">
              Aún no has registrado clientes. Cuando confirmes reservas desde la agenda, aparecerán aquí automáticamente.
            </p>
            <Button variant="outline" className="border-white/20 text-white hover:bg-white/10" disabled>
              Crear cliente manualmente (en camino)
            </Button>
          </div>
        ) : (
          <ScrollArea className="max-h-[520px]">
            <Table className="text-sm text-white/80">
              <TableHeader>
                <TableRow className="border-white/5">
                  <TableHead className="text-white/70">Cliente</TableHead>
                  <TableHead className="text-white/70">Última visita</TableHead>
                  <TableHead className="text-white/70">Próxima visita</TableHead>
                  <TableHead className="text-white/70">Histórico</TableHead>
                  <TableHead className="text-white/70">Contacto</TableHead>
                  <TableHead className="text-right text-white/70">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id} className="border-white/5">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-white/10 bg-white/10">
                          <AvatarFallback className="text-xs text-white/80">{client.initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium text-white">{client.name}</span>
                          <div className="flex flex-wrap items-center gap-1">
                            <Badge variant="secondary" className={`border border-transparent text-xs uppercase tracking-wide ${CLIENT_STATUS_BADGE[client.status]}`}>
                              {CLIENT_STATUS_LABELS[client.status]}
                            </Badge>
                            {client.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="border-white/20 text-[11px] text-white/60">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="flex flex-col">
                        <span className="text-white">{client.lastVisitLabel}</span>
                        {client.lastVisitRelative ? (
                          <span className="text-xs text-white/50">{client.lastVisitRelative}</span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      {client.upcomingLabel ? (
                        <span className="text-sm text-emerald-200">{client.upcomingLabel}</span>
                      ) : (
                        <span className="text-xs text-white/50">Sin cita programada</span>
                      )}
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="flex flex-col text-sm text-white/80">
                        <span className="font-medium text-white">{client.totalVisits} visitas</span>
                        <span className="text-xs text-white/50">{formatEuro(client.totalSpent)} acumulados</span>
                        {client.favoriteServices.length ? (
                          <span className="mt-1 text-xs text-white/50">
                            Favoritos: {client.favoriteServices.join(', ')}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      {client.contact ? (
                        <div className="flex flex-col text-xs text-white/60">
                          {client.contact.phone ? <span>{client.contact.phone}</span> : null}
                          {client.contact.email ? <span>{client.contact.email}</span> : null}
                        </div>
                      ) : (
                        <span className="text-xs text-white/40">Sin datos</span>
                      )}
                    </TableCell>
                    <TableCell className="align-top text-right">
                      <Button variant="ghost" size="sm" className="text-white/70 hover:text-white" disabled>
                        Abrir ficha (pronto)
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
