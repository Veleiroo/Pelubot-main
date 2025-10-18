import type React from "react"
import { ProHeader } from "@/components/pros/pro-header"

export default function ProsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      <ProHeader />
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
