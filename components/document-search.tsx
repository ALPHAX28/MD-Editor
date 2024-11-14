"use client"

import { useState, useEffect } from "react"
import { Search, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Document } from "@/types"
import { ScrollArea } from "@/components/ui/scroll-area"

interface DocumentSearchProps {
  documents: Document[]
  onSelect: (documentId: string) => Promise<void>
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function DocumentSearch({
  documents,
  onSelect,
  isOpen,
  onOpenChange,
}: DocumentSearchProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredDocs, setFilteredDocs] = useState<Document[]>([])
  const [loadingDocId, setLoadingDocId] = useState<string | null>(null)

  useEffect(() => {
    const filtered = documents.filter(doc =>
      doc.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
    setFilteredDocs(filtered)
  }, [searchQuery, documents])

  const handleSelect = async (documentId: string) => {
    setLoadingDocId(documentId)
    await onSelect(documentId)
    setLoadingDocId(null)
    onOpenChange(false)
    setSearchQuery("")
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Search Documents</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>
          <ScrollArea className="h-[300px]">
            {filteredDocs.length > 0 ? (
              <div className="space-y-2">
                {filteredDocs.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => handleSelect(doc.id)}
                    className="p-2 hover:bg-accent rounded-md cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{doc.title}</span>
                    </div>
                    {loadingDocId === doc.id && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-6">
                No documents found
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
} 