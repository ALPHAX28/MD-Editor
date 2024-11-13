import { Loader2 } from "lucide-react"

interface DocumentLoadingProps {
  status: 'loading' | 'loaded' | 'error' | 'idle'
}

export function DocumentLoading({ status }: DocumentLoadingProps) {
  if (status !== 'loading') return null

  return (
    <div className="fixed top-4 right-4 flex items-center gap-2 p-2 rounded-md bg-background border shadow-sm">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className="text-sm">Loading document...</span>
    </div>
  )
} 