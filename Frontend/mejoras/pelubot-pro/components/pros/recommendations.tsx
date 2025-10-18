import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Lightbulb } from "lucide-react"

const recommendations = [
  {
    title: "Promociona coloración en redes",
    description:
      "Tu servicio de coloración ha crecido un 8%. Comparte fotos de antes/después para atraer más clientas.",
  },
  {
    title: "Reactiva clientas inactivas",
    description:
      "17 clientas llevan más de 90 días sin visitar. Envía un mensaje personalizado con un descuento especial.",
  },
  {
    title: "Optimiza horarios de tarde",
    description: "Las citas de tarde tienen menor ocupación. Considera ofrecer promociones para esas franjas horarias.",
  },
]

export function Recommendations() {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-2">
        <Lightbulb className="w-5 h-5" />
        <h2 className="text-lg font-semibold">Recomendaciones accionables</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-6">Ideas basadas en tus cifras actuales para seguir creciendo.</p>

      <div className="space-y-4">
        {recommendations.map((rec, idx) => (
          <div key={idx} className="p-4 rounded-lg bg-secondary/30 border border-border">
            <h3 className="font-semibold text-sm mb-2">{rec.title}</h3>
            <p className="text-xs text-muted-foreground mb-3">{rec.description}</p>
            <Button variant="outline" size="sm" className="w-full bg-transparent">
              Ver detalles
            </Button>
          </div>
        ))}
      </div>
    </Card>
  )
}
