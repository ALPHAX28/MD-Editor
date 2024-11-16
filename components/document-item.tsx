import { Button } from "@/components/ui/button"
import { File, MoreVertical, Pencil, Trash, Loader2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Document } from "@/types"

interface DocumentItemProps {
  document: Document
  isActive: boolean
  isLoading?: boolean
  onSelect: (documentId: string) => void
  onDelete: (doc: Document) => void
  onRename: (doc: Document) => void
}

export function DocumentItem({
  document,
  isActive,
  isLoading,
  onSelect,
  onDelete,
  onRename,
}: DocumentItemProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onDelete(document)
  }

  const handleRename = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onRename(document)
  }

  return (
    <div className="mb-2">
      <div
        className={`group flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 cursor-pointer ${
          isActive ? 'bg-accent' : ''
        }`}
        onClick={() => onSelect(document.id)}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <File className="h-4 w-4 shrink-0" />
          <span className="truncate">{document.title}</span>
        </div>
        <div className="flex items-center gap-2">
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleRename}>
                <Pencil className="h-4 w-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={handleDelete}
              >
                <Trash className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
} 