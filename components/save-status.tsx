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

  return (
    <div className={cn("flex items-center", className)}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative cursor-pointer">
              {status === 'saving' && (
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
          <TooltipContent side="bottom" className="flex flex-col gap-2">
            {status === 'saving' && <p>Saving changes...</p>}
            {status === 'saved' && (
              <>
                <p>All changes saved</p>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-muted-foreground">
                    Save again (Alt + Shift + S)
                  </p>
                  {onManualSave && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={onManualSave}
                      disabled={status === 'saving'}
                      className="h-7 px-2"
                    >
                      Save
                    </Button>
                  )}
                </div>
              </>
            )}
            {status === 'error' && <p>Failed to save changes</p>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
} 