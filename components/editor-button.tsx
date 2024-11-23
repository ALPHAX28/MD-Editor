"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

export function EditorButton() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleClick = () => {
    setIsLoading(true)
    router.push('/editor')
  }

  return (
    <Button 
      size="lg" 
      className="gap-2"
      onClick={handleClick}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Going to Editor...
        </>
      ) : (
        <>
          Go to Editor
          <ArrowRight className="h-4 w-4" />
        </>
      )}
    </Button>
  )
} 