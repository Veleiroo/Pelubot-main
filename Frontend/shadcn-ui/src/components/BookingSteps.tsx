import { Check } from '@/lib/icons';

export type BookingStep = { key: string; label: string; active?: boolean; done?: boolean };

const DEFAULT_STEPS: BookingStep[] = [
	{ key: 'service', label: 'Servicio' },
	{ key: 'date', label: 'Fecha y hora' },
	{ key: 'confirm', label: 'Confirmar' },
];

export function BookingSteps({ steps = DEFAULT_STEPS }: { steps?: BookingStep[] }) {
	const activeIdx = steps.findIndex((s) => s.active);
	const lastDoneIdx = (() => {
		let idx = -1;
		steps.forEach((s, i) => {
			if (s.done) idx = i;
		});
		return idx;
	})();
	const idxForProgress = activeIdx >= 0 ? activeIdx : lastDoneIdx;
	const count = steps.length;
	const progress =
		count > 1 && idxForProgress >= 0 ? (idxForProgress / (count - 1)) * 100 : 0;

	return (
		<nav aria-label="Progreso de reserva" className="mx-auto max-w-4xl px-6 sm:px-8 mb-8">
			{/* Barra de progreso simple y accesible */}
			<div
				className="h-1 w-full bg-[var(--border)] rounded-full overflow-hidden mb-4"
				aria-hidden
			>
				<div
					className="h-full bg-accent transition-all duration-200"
					style={{ width: `${progress}%` }}
				/>
			</div>
			<ol className="flex items-center justify-between">
				{steps.map((s, i) => {
					const isCurrent =
						s.active ?? (activeIdx === -1 ? i === 0 : i === activeIdx);
					const isDone = s.done ?? (activeIdx >= 0 ? i < activeIdx : i <= lastDoneIdx);
					const enabled = false; // sin navegación por pasos por ahora
					return (
						<li key={s.key} className="flex flex-col items-center">
							<button
								aria-current={isCurrent ? 'step' : undefined}
								aria-label={s.label}
								disabled={!enabled}
								className={[
									'flex items-center justify-center w-9 h-9 rounded-full text-xs font-semibold transition-colors duration-150',
									isDone
										? 'bg-accent text-accent-foreground'
										: isCurrent
										? 'ring-2 ring-accent text-foreground'
										: 'text-muted-foreground',
								].join(' ')}
							>
								{isDone ? (
									<Check className="h-4 w-4" />
								) : (
									<span>{i + 1}</span>
								)}
							</button>
							<span
								className={[
									'mt-2 text-xs transition-colors duration-150',
									isCurrent
										? 'text-foreground font-medium'
										: isDone
										? 'text-foreground'
										: 'text-muted-foreground',
								].join(' ')}
							>
								{s.label}
							</span>
						</li>
					);
				})}
			</ol>
		</nav>
	);
}

export default BookingSteps;
