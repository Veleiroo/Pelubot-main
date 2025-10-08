import { Loader2 } from '@/lib/icons';

const Loading = () => (
  <div
    className="flex items-center justify-center p-16"
    role="status"
    aria-live="polite"
    aria-label="Cargando contenido"
  >
    <Loader2 className="h-8 w-8 animate-spin text-emerald-400" aria-hidden="true" />
    <span className="sr-only">Cargando…</span>
  </div>
);

export default Loading;
