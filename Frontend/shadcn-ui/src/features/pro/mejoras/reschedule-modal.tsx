import { useState } from 'react';

import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Bell, Calendar, CalendarClock, Clock, X } from 'lucide-react';

type RescheduleModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: {
    client: string;
    date: string;
    time: string;
    service: string;
  };
};

const availableSlots = [
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '12:30',
  '13:00',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
  '17:30',
];

const cb = (...classes: string[]) => classes.filter(Boolean).join(' ');

export const RescheduleModal = ({ open, onOpenChange, appointment }: RescheduleModalProps) => {
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [notifyClient, setNotifyClient] = useState(true);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-border bg-card">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground">Reprogramar cita</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Selecciona una nueva fecha y hora para la cita.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-6">
          <Card className="border-border/50 bg-secondary/30 p-4">
            <h4 className="mb-3 text-sm font-semibold text-muted-foreground">Cita actual</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="text-lg font-semibold text-foreground">{appointment?.client ?? 'Laura Pérez'}</p>
              <p>{appointment?.service ?? 'Corte y peinado'}</p>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{appointment?.date ?? '14 oct 2025'}</span>
                <span>•</span>
                <Clock className="h-4 w-4" />
                <span>{appointment?.time ?? '09:30'}</span>
              </div>
            </div>
          </Card>

          <div className="flex items-center justify-center gap-4 py-4 text-sm text-muted-foreground">
            <div className="text-center">
              <p className="mb-1 text-xs uppercase tracking-wider">De:</p>
              <p className="font-semibold">{appointment?.date ?? '14 oct 2025'}</p>
              <p>{appointment?.time ?? '09:30'}</p>
            </div>
            <CalendarClock className="h-6 w-6 text-accent" />
            <div className="text-center">
              <p className="mb-1 text-xs uppercase tracking-wider">A:</p>
              <p className="font-semibold">{newDate || 'Seleccionar'}</p>
              <p>{newTime || 'Seleccionar'}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-date" className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Calendar className="h-4 w-4" />
              Nueva fecha
            </Label>
            <Input
              id="new-date"
              type="date"
              value={newDate}
              onChange={(event) => setNewDate(event.target.value)}
              className="border-border bg-secondary/50"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Clock className="h-4 w-4" />
              Nuevo horario
            </Label>
            <div className="grid grid-cols-6 gap-2">
              {availableSlots.map((slot) => (
                <Button
                  key={slot}
                  variant={newTime === slot ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setNewTime(slot)}
                  className={newTime === slot ? 'bg-accent hover:bg-accent/90' : 'border-border bg-secondary/50 hover:bg-secondary'}
                >
                  {slot}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2 rounded-lg border border-border bg-secondary/50 p-4">
            <Checkbox
              id="notify"
              checked={notifyClient}
              onCheckedChange={(checked) => setNotifyClient(Boolean(checked))}
            />
            <Label
              htmlFor="notify"
              className="flex cursor-pointer items-center gap-2 text-sm font-medium text-muted-foreground"
            >
              <Bell className="h-4 w-4" />
              Notificar al cliente del cambio
            </Label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90" disabled={!newDate || !newTime}>
              Confirmar cambio
            </Button>
            <Button
              variant="outline"
              className="border-border bg-transparent hover:bg-secondary"
              onClick={() => onOpenChange(false)}
            >
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RescheduleModal;
