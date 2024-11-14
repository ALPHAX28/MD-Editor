"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export function EditorButton() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleClick = async () => {
    try {
      setIsLoading(true)
      router.push('/editor')
    } catch (error) {
      console.error('Navigation failed:', error)
    }
  }

  return (
    <Button 
      onClick={handleClick}
      disabled={isLoading}
      size="lg"
      className="bg-black text-white dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading Editor...
        </>
      ) : (
        'Go to Editor'
      )}
    </Button>
  )
} 