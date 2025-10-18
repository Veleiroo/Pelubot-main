import { AgendaCalendar } from "@/components/pros/agenda-calendar"
import { AgendaAppointments } from "@/components/pros/agenda-appointments"

export default function AgendaPage() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 max-w-[1600px] mx-auto h-[calc(100vh-120px)]">
      <div className="lg:h-full">
        <AgendaCalendar />
      </div>
      <div className="lg:h-full overflow-hidden">
        <AgendaAppointments />
      </div>
    </div>
  )
}
