"use client"

import { useState } from "react"
import { AppointmentCard } from "@/components/pros/appointment-card"
import { TodayAppointments } from "@/components/pros/today-appointments"
import { NewAppointmentModal } from "@/components/pros/new-appointment-modal"

export default function ResumenPage() {
  const [showNewAppointment, setShowNewAppointment] = useState(false)

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6 max-w-7xl mx-auto">
        <div className="space-y-6">
          <AppointmentCard />
        </div>

        <div>
          <TodayAppointments onNewAppointment={() => setShowNewAppointment(true)} />
        </div>
      </div>

      <NewAppointmentModal open={showNewAppointment} onOpenChange={setShowNewAppointment} />
    </>
  )
}
