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
import { useEffect } from "react"

interface SaveStatusIndicatorProps {
  status: SaveStatus
  className?: string
  onManualSave?: () => void
}

export function SaveStatusIndicator({ 
  status, 
  className,
  onManualSave 
}: SaveStatusIndicatorProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault()
        onManualSave?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onManualSave])

  const isSaving = status === 'saving'

  return (
    <div className={cn("flex items-center", className)}>
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative cursor-pointer touch-none">
              {isSaving && (
                <div className="text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              )}
              {status === 'saved' && (
                <div className="text-green-500 relative">
                  <Cloud className="h-4 w-4" />
                  <Check className="h-2.5 w-2.5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
              )}
              {status === 'error' && (
                <div className="text-destructive relative">
                  <Cloud className="h-4 w-4" />
                  <X className="h-2.5 w-2.5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent 
            side="bottom" 
            className="flex flex-col gap-2 w-[200px] touch-none"
            sideOffset={5}
          >
            {isSaving && <p className="text-center">Saving changes...</p>}
            {status === 'saved' && (
              <>
                <p className="text-center">All changes saved</p>
                <div className="flex flex-col items-center gap-2">
                  <p className="text-sm text-muted-foreground whitespace-nowrap">
                    Save again (Alt+Shift+S)
                  </p>
                  {onManualSave && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={onManualSave}
                      disabled={isSaving}
                      className="h-7 px-2"
                    >
                      Save
                    </Button>
                  )}
                </div>
              </>
            )}
            {status === 'error' && <p className="text-center">Failed to save changes</p>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
} 