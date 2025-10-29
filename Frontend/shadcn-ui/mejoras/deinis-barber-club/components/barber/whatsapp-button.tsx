"use client"

import { MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export function WhatsAppButton() {
  return (
    <Button
      size="icon"
      className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-[#25D366] hover:bg-[#20BA5A] text-white shadow-lg hover:shadow-xl transition-all duration-300 z-50 animate-pulse"
      asChild
    >
      <a href="https://wa.me/34653481270" target="_blank" rel="noopener noreferrer" aria-label="Contactar por WhatsApp">
        <MessageCircle className="w-6 h-6" />
      </a>
    </Button>
  )
}
