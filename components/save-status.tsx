import { SaveStatus } from "@/hooks/use-autosave"
import { Check, Cloud, X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useState, useEffect } from "react"

interface SaveStatusIndicatorProps {
  status: SaveStatus | undefined
  onManualSave?: () => void
  isViewMode?: boolean
}

export function SaveStatusIndicator({ 
  status,
  onManualSave,
  isViewMode = false
}: SaveStatusIndicatorProps) {
  if (isViewMode || status === undefined) {
    return null;
  }

  const [isOpen, setIsOpen] = useState(false)
  const [isManualSaving, setIsManualSaving] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault()
        handleManualSave()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleManualSave = async () => {
    if (isManualSaving || isViewMode) return
    setIsManualSaving(true)
    setIsOpen(false)
    
    try {
      await onManualSave?.()
    } finally {
      setIsManualSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {(status === 'saving' || isManualSaving) && !isViewMode && (
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Saving...</span>
        </div>
      )}
      {status === 'saved' && !isManualSaving && (
        <div className="relative">
          <TooltipProvider>
            <Tooltip 
              open={isOpen} 
              onOpenChange={setIsOpen}
              delayDuration={0}
            >
              <TooltipTrigger asChild>
                <div 
                  className="relative cursor-pointer"
                  onMouseEnter={() => setIsOpen(true)}
                  onMouseLeave={() => setIsOpen(false)}
                >
                  <Cloud className="h-5 w-5 text-green-500 hover:text-green-600 transition-colors" />
                  <Check className="h-2.5 w-2.5 text-green-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
              </TooltipTrigger>
              <TooltipContent 
                side="bottom" 
                align="end" 
                className="p-2 w-[180px]"
                onMouseEnter={() => setIsOpen(true)}
                onMouseLeave={() => setIsOpen(false)}
              >
                <div className="space-y-1.5">
                  <p className="text-xs font-medium">All changes saved successfully</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Save again</span>
                    <kbd className="text-[10px] font-mono">Alt + Shift + S</kbd>
                  </div>
                  <Button 
                    size="sm" 
                    variant="secondary"
                    className="w-full h-7 text-xs"
                    onClick={handleManualSave}
                    disabled={isManualSaving}
                  >
                    {isManualSaving ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        Saving...
                      </>
                    ) : (
                      'Save changes'
                    )}
                  </Button>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
      {status === 'error' && !isManualSaving && !isViewMode && (
        <div className="relative">
          <TooltipProvider>
            <Tooltip 
              open={isOpen} 
              onOpenChange={setIsOpen}
              delayDuration={0}
            >
              <TooltipTrigger asChild>
                <div 
                  className="relative cursor-pointer"
                  onMouseEnter={() => setIsOpen(true)}
                  onMouseLeave={() => setIsOpen(false)}
                >
                  <Cloud className="h-5 w-5 text-red-500 hover:text-red-600 transition-colors" />
                  <X className="h-2.5 w-2.5 text-red-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
              </TooltipTrigger>
              <TooltipContent 
                side="bottom" 
                align="end" 
                className="p-2 w-[180px]"
                onMouseEnter={() => setIsOpen(true)}
                onMouseLeave={() => setIsOpen(false)}
              >
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-red-500">Failed to save changes</p>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    className="w-full h-7 text-xs"
                    onClick={handleManualSave}
                    disabled={isManualSaving}
                  >
                    {isManualSaving ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        Saving...
                      </>
                    ) : (
                      'Try again'
                    )}
                  </Button>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </div>
  )
} 