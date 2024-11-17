"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Presence } from "@/hooks/use-realtime"

interface RevokeAccessDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  user: Presence | null
  documentId?: string
}

export function RevokeAccessDialog({
  isOpen,
  onOpenChange,
  user,
  documentId
}: RevokeAccessDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleRevokeAccess = async () => {
    if (!documentId || !user) return

    try {
      setIsLoading(true)
      const response = await fetch(`/api/documents/${documentId}/revoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          targetUserId: user.userId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to revoke access')
      }

      toast({
        title: "Access Revoked",
        description: `Successfully revoked edit access for ${user.userName}`,
      })

      onOpenChange(false)
    } catch (error) {
      console.error('Failed to revoke access:', error)
      toast({
        title: "Error",
        description: "Failed to revoke access",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Revoke Edit Access</DialogTitle>
          <DialogDescription>
            {user ? (
              <>
                Are you sure you want to revoke edit access for <strong>{user.userName}</strong>?
                They will still be able to view the document.
              </>
            ) : (
              "Are you sure you want to revoke edit access? They will still be able to view the document."
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleRevokeAccess}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Revoking...
              </>
            ) : (
              'Revoke Access'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 