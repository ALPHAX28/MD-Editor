import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"

interface RevokeAccessDialogProps {
  documentId: string
  userId: string
  userName: string
  onRevoked: () => void
}

export function RevokeAccessDialog({ 
  documentId, 
  userId, 
  userName,
  onRevoked 
}: RevokeAccessDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleRevoke = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/documents/${documentId}/revoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      })

      if (!response.ok) {
        throw new Error('Failed to revoke access')
      }

      toast({
        title: "Access Revoked",
        description: `Revoked edit access for ${userName}`,
      })
      
      // Don't refresh the page, just close the dialog
      setIsOpen(false)
      // Call onRevoked to update UI state if needed
      onRevoked()
    } catch (error) {
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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="destructive" 
          size="sm"
          className="w-full mt-2"
        >
          Revoke Access
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Revoke Access</DialogTitle>
          <DialogDescription>
            Are you sure you want to revoke edit access for {userName}? 
            They will still be able to view the document but won't be able to make changes.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleRevoke}
            disabled={isLoading}
          >
            {isLoading ? "Revoking..." : "Revoke Access"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 