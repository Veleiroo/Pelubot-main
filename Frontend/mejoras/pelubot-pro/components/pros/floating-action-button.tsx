"use client"

import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

interface FloatingActionButtonProps {
  onClick: () => void
}

export function FloatingActionButton({ onClick }: FloatingActionButtonProps) {
  return (
    <Button
      onClick={onClick}
      className="fixed bottom-8 right-8 h-14 w-14 rounded-full shadow-lg shadow-accent/20 bg-accent hover:bg-accent/90 text-accent-foreground z-50 transition-all hover:scale-110"
      size="icon"
    >
      <Plus className="w-6 h-6" />
    </Button>
  )
}
