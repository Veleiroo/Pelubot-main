import { ClientStats } from "@/components/pros/client-stats"
import { ClientDirectory } from "@/components/pros/client-directory"
import { ClientSegments } from "@/components/pros/client-segments"
import { ClientRetention } from "@/components/pros/client-retention"

export default function ClientesPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold mb-2">Clientes</h1>
        <p className="text-muted-foreground">
          Visualiza tus contactos, detecta oportunidades y prepara campañas de fidelización.
        </p>
      </div>

      <ClientStats />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ClientDirectory />
        </div>
        <div className="space-y-6">
          <ClientSegments />
          <ClientRetention />
        </div>
      </div>
    </div>
  )
}
