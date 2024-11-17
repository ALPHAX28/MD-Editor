import { SaveStatus } from "@/hooks/use-autosave"
import { Check, Cloud, X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface SaveStatusIndicatorProps {
  status: SaveStatus
  onManualSave?: () => void
}

export function SaveStatusIndicator({ 
  status,
  onManualSave 
}: SaveStatusIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      {status === 'saving' && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Saving...</span>
        </div>
      )}
      {status === 'saved' && (
        <div className="flex items-center gap-2 text-green-500">
          <Check className="h-4 w-4" />
          <span className="text-sm">Saved</span>
        </div>
      )}
      {status === 'error' && (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-red-500">
            <X className="h-4 w-4" />
            <span className="text-sm">Error saving</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onManualSave}
            className="h-auto p-1"
          >
            <Cloud className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
} 