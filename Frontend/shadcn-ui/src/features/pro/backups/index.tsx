import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { Download, HardDrive, Loader2, RefreshCw, RotateCcw, Trash2 } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { api, ApiError, type ProBackupEntry } from '@/lib/api';

const formatBytes = (bytes?: number | null) => {
  if (!bytes || Number.isNaN(bytes)) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const decimals = value >= 10 || unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(decimals)} ${units[unitIndex]}`;
};

const parseDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const sortBackups = (entries: ProBackupEntry[]) =>
  [...entries].sort((a, b) => {
    const aDate = parseDate(a.created_at)?.getTime() ?? 0;
    const bDate = parseDate(b.created_at)?.getTime() ?? 0;
    return bDate - aDate;
  });

export const ProsBackupsView = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [restoreTarget, setRestoreTarget] = useState<ProBackupEntry | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const backupsQuery = useQuery({
    queryKey: ['pros', 'backups'],
    queryFn: api.prosListBackups,
    staleTime: 30_000,
  });

  const deleteBackup = useMutation({
    mutationFn: (backupId: string) => api.prosDeleteBackup(backupId),
  });

  const restoreBackup = useMutation({
    mutationFn: (backupId: string) => api.prosRestoreBackup(backupId),
  });

  const createBackup = useMutation({
    mutationFn: api.prosCreateBackup,
  });

  const backups = useMemo(() => sortBackups(backupsQuery.data?.backups ?? []), [backupsQuery.data?.backups]);
  const latestBackup = backups[0];

  const errorMessage =
    backupsQuery.error instanceof ApiError
      ? backupsQuery.error.message
      : backupsQuery.error
        ? 'No pudimos cargar los respaldos.'
        : null;

  const handleDownload = async (entry: ProBackupEntry) => {
    if (typeof window === 'undefined') {
      toast({
        title: 'Descarga no disponible',
        description: 'Abre Pelubot desde un navegador para descargar el archivo.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setDownloadingId(entry.id);
      const payload = await api.prosDownloadBackup(entry.id);
      const filename = payload.filename || entry.filename || `pelubot-backup-${entry.id}.db`;
      const blobUrl = URL.createObjectURL(payload.blob);
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(blobUrl);
      toast({
        title: 'Descarga iniciada',
        description: filename,
      });
    } catch (error) {
      const description = error instanceof ApiError ? error.message : 'No se pudo descargar el archivo.';
      toast({
        title: 'Descarga fallida',
        description,
        variant: 'destructive',
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = (entry: ProBackupEntry) => {
    setDeletingId(entry.id);
    deleteBackup.mutate(entry.id, {
      onSuccess: () => {
        toast({
          title: 'Backup eliminado',
          description: `${entry.filename} se eliminó del histórico.`,
        });
        void queryClient.invalidateQueries({ queryKey: ['pros', 'backups'] });
      },
      onError: (error) => {
        const description = error instanceof ApiError ? error.message : 'No se pudo borrar el backup.';
        toast({
          title: 'No se pudo borrar',
          description,
          variant: 'destructive',
        });
      },
      onSettled: () => {
        setDeletingId(null);
      },
    });
  };

  const handleConfirmRestore = () => {
    if (!restoreTarget) return;
    setRestoringId(restoreTarget.id);
    restoreBackup.mutate(restoreTarget.id, {
      onSuccess: () => {
        toast({
          title: 'Restauración iniciada',
          description: `${restoreTarget.filename} reemplazará la base actual. El proceso puede tardar unos segundos.`,
        });
        setRestoreTarget(null);
        void queryClient.invalidateQueries({ queryKey: ['pros', 'backups'] });
      },
      onError: (error) => {
        const description = error instanceof ApiError ? error.message : 'No pudimos restaurar ese backup.';
        toast({
          title: 'Restauración fallida',
          description,
          variant: 'destructive',
        });
      },
      onSettled: () => {
        setRestoringId(null);
      },
    });
  };

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Backups</h1>
          <p className="text-sm text-muted-foreground">
            Consulta los respaldos automáticos guardados en Railway y descarga el que necesites.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => backupsQuery.refetch()}
            disabled={backupsQuery.isFetching}
          >
            {backupsQuery.isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />}
            Actualizar
          </Button>
          <Button
            size="sm"
            onClick={() => {
              createBackup.mutate(undefined, {
                onSuccess: (entry) => {
                  toast({
                    title: 'Copia creada',
                    description: `${entry.filename} quedó guardado en el servidor.`,
                  });
                  void queryClient.invalidateQueries({ queryKey: ['pros', 'backups'] });
                },
                onError: (error) => {
                  const description = error instanceof ApiError ? error.message : 'No pudimos crear la copia.';
                  toast({
                    title: 'No se pudo crear el backup',
                    description,
                    variant: 'destructive',
                  });
                },
              });
            }}
            disabled={createBackup.isPending}
          >
            {createBackup.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            Crear backup
          </Button>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">Último respaldo</CardTitle>
              <CardDescription>
                {latestBackup
                  ? 'Pelubot guarda copias diarias en tu volumen persistente.'
                  : 'Aún no hay copias almacenadas en este entorno.'}
            </CardDescription>
          </div>
            <Badge variant="secondary">
              <HardDrive className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
              {latestBackup ? 'Automático' : 'En espera'}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-2">
            {latestBackup ? (
              <>
                <p className="text-base font-semibold text-foreground">{latestBackup.filename}</p>
                <p className="text-sm text-muted-foreground">
                  Guardado el{' '}
                  {(() => {
                    const date = parseDate(latestBackup.created_at);
                    if (!date) return '—';
                    return `${format(date, "PPpp")} (${formatDistanceToNow(date, { addSuffix: true })})`;
                  })()}
                </p>
                <p className="text-sm text-muted-foreground">Tamaño: {formatBytes(latestBackup.size_bytes)}</p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">
                El sistema creará automáticamente la primera copia tras la próxima sincronización nocturna.
              </div>
            )}
          </CardContent>
        </Card>
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/40 p-5 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Recomendaciones</p>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>Descarga periódicamente el archivo para guardarlo fuera de Railway.</li>
            <li>Antes de restaurar, asegúrate de no necesitar los cambios recientes.</li>
            <li>Si necesitas soporte, comparte el nombre exacto del backup.</li>
          </ul>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Histórico de backups</CardTitle>
          <CardDescription>Elimina los que ya no necesites o restaura una copia previa.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {backupsQuery.isLoading ? (
            <div className="flex min-h-[160px] items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
              Cargando respaldos...
            </div>
          ) : errorMessage ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              {errorMessage}
              <div className="mt-2">
                <Button variant="outline" size="sm" onClick={() => backupsQuery.refetch()}>
                  Reintentar
                </Button>
              </div>
            </div>
          ) : backups.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 bg-muted/30 p-6 text-sm text-muted-foreground">
              Todavía no hay copias disponibles en este entorno.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[45%]">Archivo</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Tamaño</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backups.map((entry) => {
                  const createdAt = parseDate(entry.created_at);
                  return (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{entry.filename}</span>
                          {latestBackup?.id === entry.id ? (
                            <span className="text-xs font-semibold uppercase tracking-wide text-emerald-500">Más reciente</span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        {createdAt ? (
                          <div className="flex flex-col text-sm">
                            <span>{format(createdAt, "PPpp")}</span>
                            <span className="text-xs text-muted-foreground">{formatDistanceToNow(createdAt, { addSuffix: true })}</span>
                          </div>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="text-right">{formatBytes(entry.size_bytes)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-foreground"
                            onClick={() => handleDownload(entry)}
                            disabled={downloadingId === entry.id}
                          >
                            {downloadingId === entry.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                            ) : (
                              <Download className="h-4 w-4" aria-hidden="true" />
                            )}
                            <span className="sr-only">Descargar</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-foreground"
                            onClick={() => setRestoreTarget(entry)}
                            disabled={restoringId === entry.id}
                          >
                            {restoringId === entry.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                            ) : (
                              <RotateCcw className="h-4 w-4" aria-hidden="true" />
                            )}
                            <span className="sr-only">Restaurar</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(entry)}
                            disabled={deletingId === entry.id}
                          >
                            {deletingId === entry.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                            ) : (
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            )}
                            <span className="sr-only">Borrar</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={Boolean(restoreTarget)} onOpenChange={(open) => (!open ? setRestoreTarget(null) : undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar backup</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de reemplazar la base de datos actual por{' '}
              <strong>{restoreTarget?.filename}</strong>. Este proceso detendrá las sesiones activas y no se puede deshacer. Se recomienda
              descargar primero la copia actual.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoringId === restoreTarget?.id}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRestore} disabled={restoringId === restoreTarget?.id}>
              {restoringId === restoreTarget?.id ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              Restaurar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};

export default ProsBackupsView;
