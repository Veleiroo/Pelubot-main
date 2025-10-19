export type ProsNavItem = {
  label: string;
  to: string;
  soon?: boolean;
};

// Páginas principales (siempre visibles)
const CORE_NAV_ITEMS: ProsNavItem[] = [
  { label: 'Resumen', to: '/pros' },
  { label: 'Agenda', to: '/pros/agenda' },
];

// Páginas futuras (solo visibles en desarrollo para demos)
const FUTURE_NAV_ITEMS: ProsNavItem[] = [
  { label: 'Clientes', to: '/pros/clientes', soon: true },
  { label: 'Estadísticas', to: '/pros/estadisticas', soon: true },
];

// Exporta solo las páginas principales, o incluye futuras si está habilitado
export const PROS_NAV_ITEMS: ProsNavItem[] = 
  import.meta.env.VITE_ENABLE_FUTURE_FEATURES === 'true' 
    ? [...CORE_NAV_ITEMS, ...FUTURE_NAV_ITEMS]
    : CORE_NAV_ITEMS;
