"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Menu, Plus, File, ChevronLeft, ChevronRight } from "lucide-react"
import { useAuth } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { DocumentItem } from "@/components/document-item"
import { Document } from "@/types"
import { Input } from "@/components/ui/input"
import { SignInButton } from "@clerk/nextjs"

interface DocumentSidebarProps {
  documents: Document[]
  activeDocumentId?: string
  onDocumentSelect: (documentId: string) => void
  onNewDocument: (title: string) => Promise<void>
  onDeleteDocument: (documentId: string) => void
  onRenameDocument: (documentId: string, newTitle: string) => void
  className?: string
  isCollapsed: boolean
  onToggle: () => void
  isSheetOpen?: boolean
  onSheetOpenChange?: (open: boolean) => void
}

export function DocumentSidebar({
  documents,
  activeDocumentId,
  onDocumentSelect,
  onNewDocument,
  onDeleteDocument,
  onRenameDocument,
  className,
  isCollapsed,
  onToggle,
  isSheetOpen,
  onSheetOpenChange,
}: DocumentSidebarProps) {
  const { isSignedIn } = useAuth()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [showNewDocDialog, setShowNewDocDialog] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const router = useRouter()

  const handleDeleteClick = (doc: Document) => {
    setSelectedDocument(doc)
    setShowDeleteDialog(true)
  }

  const handleRenameClick = (doc: Document) => {
    setSelectedDocument(doc)
    setNewTitle(doc.title)
    setShowRenameDialog(true)
  }

  const handleConfirmDelete = () => {
    if (selectedDocument) {
      onDeleteDocument(selectedDocument.id)
    }
    setShowDeleteDialog(false)
    setSelectedDocument(null)
  }

  const handleConfirmRename = () => {
    if (selectedDocument && newTitle.trim()) {
      onRenameDocument(selectedDocument.id, newTitle.trim())
    }
    setShowRenameDialog(false)
    setSelectedDocument(null)
    setNewTitle('')
  }

  const handleNewDocumentClick = () => {
    setNewTitle('')
    setShowNewDocDialog(true)
  }

  const handleCreateDocument = async () => {
    if (newTitle.trim()) {
      await onNewDocument(newTitle.trim())
      setShowNewDocDialog(false)
      setNewTitle('')
    }
  }

  const SidebarContent = () => (
    <div className="h-full flex flex-col gap-2 p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold">Documents</h2>
        <div className="flex items-center gap-2">
          {isSignedIn ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleNewDocumentClick}
              className="dark:bg-white dark:text-black dark:hover:bg-gray-200 bg-black text-white hover:bg-gray-800"
            >
              New
            </Button>
          ) : (
            <SignInButton mode="modal">
              <Button
                variant="outline"
                size="sm"
                className="dark:bg-white dark:text-black dark:hover:bg-gray-200 bg-black text-white hover:bg-gray-800"
              >
                Sign in
              </Button>
            </SignInButton>
          )}
        </div>
      </div>
      
      {isSignedIn ? (
        <ScrollArea className="flex-1">
          <div className="space-y-2">
            {documents.map((doc) => (
              <DocumentItem
                key={doc.id}
                document={doc}
                isActive={doc.id === activeDocumentId}
                onSelect={(id) => {
                  onDocumentSelect(id)
                  onSheetOpenChange?.(false)
                }}
                onDelete={handleDeleteClick}
                onRename={handleRenameClick}
              />
            ))}
          </div>
        </ScrollArea>
      ) : (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-center text-muted-foreground p-4">
          <p>Sign in to create and manage multiple documents</p>
          <SignInButton mode="modal">
            <Button variant="outline" size="sm">
              Sign in to get started
            </Button>
          </SignInButton>
        </div>
      )}
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar with collapse button */}
      <div className={`hidden sm:flex transition-all duration-300 ${isCollapsed ? 'w-0' : 'w-64'} relative`}>
        <div className={`border-r w-full h-screen overflow-hidden ${isCollapsed ? 'invisible' : 'visible'}`}>
          <SidebarContent />
        </div>
        <div className="absolute -right-3 top-1/2 transform -translate-y-1/2">
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6 rounded-full border shadow-md bg-background"
            onClick={onToggle}
          >
            {isCollapsed ? (
              <ChevronRight className="h-3 w-3" />
            ) : (
              <ChevronLeft className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Sheet */}
      <Sheet 
        open={isSheetOpen} 
        onOpenChange={onSheetOpenChange}
        modal={false}
      >
        <SheetContent 
          side="left" 
          className="w-[280px] p-0"
        >
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedDocument?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Document</DialogTitle>
            <DialogDescription>
              Enter a new name for your document.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Document name"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRenameDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmRename}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Document Dialog */}
      <Dialog open={showNewDocDialog} onOpenChange={setShowNewDocDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Document</DialogTitle>
            <DialogDescription>
              Enter a name for your new document.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="new-doc-name">Document Name</Label>
            <Input
              id="new-doc-name"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Untitled Document"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNewDocDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateDocument}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
} 