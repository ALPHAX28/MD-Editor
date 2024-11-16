"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Menu, Plus, File, ChevronLeft, ChevronRight, Search, Loader2 } from "lucide-react"
import { useAuth, UserButton } from "@clerk/nextjs"
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
import { DocumentSearch } from "@/components/document-search"
import { AuthDialog } from "@/components/auth/auth-dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

interface DocumentSidebarProps {
  documents: Document[]
  activeDocumentId?: string
  onDocumentSelect: (documentId: string) => Promise<void>
  onNewDocument: (title: string) => Promise<void>
  onDeleteDocument: (documentId: string) => void
  onRenameDocument: (documentId: string, newTitle: string) => void
  className?: string
  isCollapsed: boolean
  onToggle: () => void
  isSheetOpen?: boolean
  onSheetOpenChange?: (open: boolean) => void
}

const isMobile = () => {
  if (typeof window === 'undefined') return false
  return window.innerWidth <= 768
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
  const [showSearchDialog, setShowSearchDialog] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isLoadingDocs, setIsLoadingDocs] = useState(true)
  const isInitialLoad = useRef(true)
  const [loadingDocId, setLoadingDocId] = useState<string | null>(null)
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up">("sign-in")
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameError, setRenameError] = useState("")
  const [newDocError, setNewDocError] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey) {
        if (e.key === 'n') {
          e.preventDefault()
          if (isSignedIn) {
            handleNewDocumentClick()
          }
        } else if (e.key === 's') {
          e.preventDefault()
          if (isSignedIn) {
            setShowSearchDialog(true)
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSignedIn])

  useEffect(() => {
    if (isInitialLoad.current) {
      setIsLoadingDocs(true)
      
      const timer = setTimeout(() => {
        if (Array.isArray(documents)) {
          setIsLoadingDocs(false)
          isInitialLoad.current = false
        }
      }, 1000)
      
      return () => clearTimeout(timer)
    }
  }, [documents])

  const handleDeleteClick = (doc: Document) => {
    setSelectedDocument(doc)
    setShowDeleteDialog(true)
  }

  const handleRenameClick = (doc: Document) => {
    setSelectedDocument(doc)
    setNewTitle(doc.title)
    setShowRenameDialog(true)
  }

  const handleConfirmDelete = async () => {
    if (selectedDocument) {
      try {
        setIsDeleting(true)
        await onDeleteDocument(selectedDocument.id)
        setShowDeleteDialog(false)
        setSelectedDocument(null)
      } catch (error) {
        console.error('Failed to delete document:', error)
      } finally {
        setIsDeleting(false)
      }
    }
  }

  const handleConfirmRename = async () => {
    if (!newTitle.trim()) {
      setRenameError("Document name cannot be empty")
      return
    }

    if (selectedDocument) {
      try {
        setIsRenaming(true)
        setRenameError("")
        await onRenameDocument(selectedDocument.id, newTitle.trim())
        setShowRenameDialog(false)
        setSelectedDocument(null)
        setNewTitle('')
        toast({
          description: "Document renamed successfully",
        })
      } catch (error) {
        console.error('Failed to rename document:', error)
        toast({
          variant: "destructive",
          description: "Failed to rename document",
        })
      } finally {
        setIsRenaming(false)
      }
    }
  }

  const handleNewDocumentClick = () => {
    setNewTitle('')
    setShowNewDocDialog(true)
  }

  const handleCreateDocument = async () => {
    if (!newTitle.trim()) {
      setNewDocError("Document name cannot be empty")
      return
    }

    try {
      setIsCreating(true)
      setNewDocError("")
      await onNewDocument(newTitle.trim())
      setShowNewDocDialog(false)
      setNewTitle('')
      toast({
        description: "Document created successfully",
      })
    } catch (error) {
      console.error('Failed to create document:', error)
      toast({
        variant: "destructive",
        description: "Failed to create document",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleDocumentSelect = async (id: string) => {
    setLoadingDocId(id)
    await onDocumentSelect(id)
    setLoadingDocId(null)
    onSheetOpenChange?.(false)
  }

  const SidebarContent = () => (
    <div className="h-full flex flex-col gap-2 p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold">Documents</h2>
        <div className="flex items-center gap-2">
          {isSignedIn ? (
            <>
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowSearchDialog(true)}
                      className="h-8 w-8"
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent 
                    side="bottom" 
                    className="hidden sm:block"
                  >
                    Search (Alt + S)
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNewDocumentClick}
                      className="dark:bg-white dark:text-black dark:hover:bg-gray-200 bg-black text-white hover:bg-gray-800"
                    >
                      New
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>New Document (Alt + N)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAuthMode("sign-in")
                setShowAuthDialog(true)
              }}
              className="bg-white text-black hover:bg-gray-100 dark:bg-white dark:text-black dark:hover:bg-gray-100"
            >
              Sign in
            </Button>
          )}
        </div>
      </div>
      
      {isSignedIn ? (
        <ScrollArea className="flex-1">
          {isLoadingDocs ? (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-120px)] gap-3">
              <Loader2 className="h-10 w-10 animate-spin" />
              <p className="text-sm text-muted-foreground font-medium">
                Loading documents...
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <DocumentItem
                  key={doc.id}
                  document={doc}
                  isActive={doc.id === activeDocumentId}
                  isLoading={doc.id === loadingDocId}
                  onSelect={handleDocumentSelect}
                  onDelete={handleDeleteClick}
                  onRename={handleRenameClick}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      ) : (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-center text-muted-foreground p-4">
          <p>&quot;Sign in to create and manage multiple documents&quot;</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setAuthMode("sign-in")
              setShowAuthDialog(true)
            }}
          >
            Sign in to get started
          </Button>
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
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
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
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newTitle}
                  onChange={(e) => {
                    setNewTitle(e.target.value)
                    setRenameError("")  // Clear error when user types
                  }}
                  placeholder="Document name"
                  className={cn(
                    renameError && "border-red-500 focus-visible:ring-red-500"
                  )}
                />
                {renameError && (
                  <p className="text-sm text-red-500">
                    {renameError}
                  </p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRenameDialog(false)
                setRenameError("")
              }}
              disabled={isRenaming}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmRename}
              disabled={isRenaming}
            >
              {isRenaming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Renaming...
                </>
              ) : (
                'Rename'
              )}
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
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-doc-name">Document Name</Label>
                <Input
                  id="new-doc-name"
                  value={newTitle}
                  onChange={(e) => {
                    setNewTitle(e.target.value)
                    setNewDocError("")  // Clear error when user types
                  }}
                  placeholder="Untitled Document"
                  autoFocus
                  className={cn(
                    newDocError && "border-red-500 focus-visible:ring-red-500"
                  )}
                />
                {newDocError && (
                  <p className="text-sm text-red-500">
                    {newDocError}
                  </p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowNewDocDialog(false)
                setNewDocError("")
              }}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateDocument} 
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add the search dialog */}
      <DocumentSearch
        documents={documents}
        onSelect={onDocumentSelect}
        isOpen={showSearchDialog}
        onOpenChange={setShowSearchDialog}
      />

      <AuthDialog 
        mode={authMode}
        isOpen={showAuthDialog}
        onOpenChange={setShowAuthDialog}
      />
    </>
  )
} 