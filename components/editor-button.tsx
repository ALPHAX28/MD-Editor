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
      await new Promise(resolve => setTimeout(resolve, 500))
      router.push('/editor')
    } catch (error) {
      console.error('Navigation failed:', error)
      setIsLoading(false)
    }
  }

  return (
    <Button 
      onClick={handleClick}
      disabled={isLoading}
      size="lg"
      className={`
        bg-black text-white dark:bg-white dark:text-black 
        hover:bg-gray-800 dark:hover:bg-gray-200
        transition-all duration-200
        ${isLoading ? 'opacity-80' : ''}
      `}
    >
      {isLoading ? (
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Opening Editor...</span>
        </div>
      ) : (
        'Go to Editor'
      )}
    </Button>
  )
} 