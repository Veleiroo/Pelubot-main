import { LucideIcon } from '@/lib/icons';
import { cn } from '@/lib/utils';

interface Props {
  title: string;
  duration: string;
  price: string;
  icon?: LucideIcon;
  onSelect: () => void;
  attrsId?: string;
  selected?: boolean;
}

export function ServiceCard({ title, duration, price, icon: Icon, onSelect, attrsId, selected = false }: Props) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-describedby={attrsId}
      aria-pressed={selected}
      className={cn(
        'group h-full w-full rounded-2xl border bg-card p-6 text-left shadow-soft transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        selected
          ? 'border-brand ring-1 ring-brand/40'
          : 'border-border hover:border-brand/60 hover:shadow-lg'
      )}
    >
      <div className="flex h-full flex-col justify-between gap-4">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {Icon ? (
              <span className="grid h-12 w-12 flex-none place-items-center rounded-xl bg-brand/10 text-brand">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </span>
            ) : null}
            <div>
              <h3 className="text-lg font-semibold leading-6 text-foreground">{title}</h3>
              <p className="text-sm leading-6 text-muted-foreground">{price}</p>
            </div>
          </div>

          <dl id={attrsId} className="grid gap-1 text-sm leading-6 text-muted-foreground">
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground">Duración</span>
              <span>{duration}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground">Precio</span>
              <span>{price}</span>
            </div>
          </dl>
        </div>

        <span className="inline-flex w-fit items-center rounded-xl bg-brand px-3 py-2 text-sm font-medium text-black transition group-hover:brightness-110">
          Seleccionar servicio
        </span>
      </div>
    </button>
  );
}

export default ServiceCard;
