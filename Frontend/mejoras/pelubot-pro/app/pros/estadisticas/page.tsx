import { StatsCards } from "@/components/pros/stats-cards"
import { RevenueChart } from "@/components/pros/revenue-chart"
import { ClientRetentionStats } from "@/components/pros/client-retention-stats"
import { TopServices } from "@/components/pros/top-services"
import { Recommendations } from "@/components/pros/recommendations"

export default function EstadisticasPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold mb-2">Estadísticas</h1>
        <p className="text-muted-foreground">
          Controla tus ingresos, fidelización y servicios estrella para tomar decisiones más rápido.
        </p>
      </div>

      <StatsCards />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RevenueChart />
        </div>
        <div>
          <ClientRetentionStats />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopServices />
        <Recommendations />
      </div>
    </div>
  )
}
