"use client"

import { useState, useEffect } from "react"
import { Check, Copy, Globe, Lock, Users, Loader2 } from "lucide-react"
import { useAuth } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface ShareDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  documentId: string
  onShare: (mode: "view" | "edit") => Promise<string>
}

export function ShareDialog({ 
  isOpen, 
  onOpenChange, 
  documentId,
  onShare 
}: ShareDialogProps) {
  const [shareMode, setShareMode] = useState<"view" | "edit">("view")
  const [shareUrl, setShareUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [isNewLink, setIsNewLink] = useState(false)
  const { toast } = useToast()
  const { isSignedIn } = useAuth()

  const canShare = Boolean(documentId) && isSignedIn

  // Reset states when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setShareUrl("")
      setShowSuccess(false)
      setIsNewLink(false)
    }
  }, [isOpen])

  // Reset link when mode changes
  const handleModeChange = (value: string) => {
    setShareMode(value as "view" | "edit")
    setShareUrl("")
    setShowSuccess(false)
    setIsNewLink(false)
  }

  const handleShare = async () => {
    try {
      setIsLoading(true)
      setShowSuccess(false)
      const url = await onShare(shareMode)
      setShareUrl(url)
      setIsNewLink(Boolean(shareUrl))
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate share link",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
      toast({
        title: "Success",
        description: "Link copied to clipboard",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share document</DialogTitle>
          <DialogDescription>
            {!canShare 
              ? "You need to save the document before sharing"
              : "Choose how you want to share this document"
            }
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          {canShare ? (
            <>
              <RadioGroup
                value={shareMode}
                onValueChange={handleModeChange}
                className="gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="view" id="view" />
                  <Label htmlFor="view" className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    <div>
                      <p className="font-medium">View only</p>
                      <p className="text-sm text-muted-foreground">
                        Anyone with the link can view
                      </p>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="edit" id="edit" />
                  <Label htmlFor="edit" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <div>
                      <p className="font-medium">Edit access</p>
                      <p className="text-sm text-muted-foreground">
                        Only signed in users can edit
                      </p>
                    </div>
                  </Label>
                </div>
              </RadioGroup>

              {shareUrl ? (
                <div className="space-y-4">
                  {showSuccess && (
                    <div className="flex items-center gap-2 text-sm font-medium text-green-500">
                      <Check className="h-4 w-4" />
                      {isNewLink ? 'New link generated successfully' : 'Link generated successfully'}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Input
                      value={shareUrl}
                      readOnly
                      className={cn(
                        "flex-1",
                        "focus-visible:ring-green-500",
                        "border-green-500"
                      )}
                    />
                    <Button
                      type="button"
                      size="icon"
                      onClick={copyToClipboard}
                      className={cn(
                        "shrink-0",
                        isCopied && "bg-green-500 text-white hover:bg-green-600"
                      )}
                    >
                      {isCopied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <Button
                    onClick={handleShare}
                    disabled={isLoading}
                    variant="outline"
                    className="w-full"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating new link...
                      </>
                    ) : (
                      'Generate new link'
                    )}
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={handleShare}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Generate link'
                  )}
                </Button>
              )}
            </>
          ) : (
            <div className="text-center text-muted-foreground">
              Please save your document first before sharing.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
} 