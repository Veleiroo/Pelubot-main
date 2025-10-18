import { Card } from '@/components/ui/card';

const stats = [
  { label: 'Clientes totales', value: '5', description: '2 con visitas recientes' },
  { label: 'Clientes recurrentes', value: '2', description: 'Última visita dentro de 90 días' },
  { label: 'Clientes nuevos', value: '1', description: 'Registrados el último trimestre' },
  { label: 'Clientes a recuperar', value: '2', description: '1 en seguimiento · 1 inactivos' },
] as const;

export const ClientStats = () => (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
    {stats.map((stat) => (
      <Card key={stat.label} className="p-6">
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">{stat.label}</h3>
        <p className="mb-2 text-4xl font-bold text-foreground">{stat.value}</p>
        <p className="text-xs text-muted-foreground">{stat.description}</p>
      </Card>
    ))}
  </div>
);

export default ClientStats;
