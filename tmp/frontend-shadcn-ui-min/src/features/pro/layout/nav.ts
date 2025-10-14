export type ProsNavItem = {
  label: string;
  to: string;
  soon?: boolean;
};

export const PROS_NAV_ITEMS: ProsNavItem[] = [
  { label: 'Resumen', to: '/pros' },
  { label: 'Agenda', to: '/pros/agenda' },
  { label: 'Clientes', to: '/pros/clientes' },
  { label: 'Estadísticas', to: '/pros/estadisticas' },
];
