import { Card } from "@/components/ui/card"
import { Sparkles } from "lucide-react"

export function TopServices() {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-5 h-5" />
        <h2 className="text-lg font-semibold">Servicios con mejor desempeño</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Ranking de ingresos del mes actual frente al anterior. Úsalo para enfocar promociones.
      </p>

      <div className="space-y-4">
        <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Corte y peinado</h3>
            <span className="text-lg font-bold">1250 €</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div className="bg-primary h-2 rounded-full" style={{ width: "75%" }} />
          </div>
          <p className="text-xs text-muted-foreground mt-2">+15% vs. mes anterior</p>
        </div>

        <div className="p-4 rounded-lg bg-secondary/30 border border-border">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Coloración</h3>
            <span className="text-lg font-bold">980 €</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div className="bg-primary h-2 rounded-full" style={{ width: "60%" }} />
          </div>
          <p className="text-xs text-muted-foreground mt-2">+8% vs. mes anterior</p>
        </div>

        <div className="p-4 rounded-lg bg-secondary/30 border border-border">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Tratamientos</h3>
            <span className="text-lg font-bold">720 €</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div className="bg-primary h-2 rounded-full" style={{ width: "45%" }} />
          </div>
          <p className="text-xs text-muted-foreground mt-2">+3% vs. mes anterior</p>
        </div>
      </div>
    </Card>
  )
}
