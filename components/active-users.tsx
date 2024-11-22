"use client"

import { AnimatePresence, motion } from "framer-motion"
import { MoreHorizontal } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { RevokeAccessDialog } from "./revoke-access-dialog"
import { useState, useEffect } from "react"
import { Presence } from "@/hooks/use-realtime"
import { useUser } from "@clerk/nextjs"
import { cn } from "@/lib/utils"

interface ActiveUsersProps {
  presenceState: Record<string, Presence[]>
  documentId?: string
  isOwner: boolean
  shareMode?: string
  isAccessRevoked?: boolean
}

export function ActiveUsers({ 
  presenceState, 
  documentId,
  isOwner,
  shareMode,
  isAccessRevoked = false
}: ActiveUsersProps) {
  const [selectedUser, setSelectedUser] = useState<Presence | null>(null)
  const [showRevokeDialog, setShowRevokeDialog] = useState(false)
  const { user } = useUser()

  // Filter users for current document and remove duplicates
  const activeUsers = Object.values(presenceState)
    .flat()
    .filter((p): p is Presence => 
      Boolean(p.userId) && 
      p.documentId === documentId &&
      Boolean(p)
    )
    .filter((p, index, self) => 
      self.findIndex(s => s.userId === p.userId) === index
    )

  // Debug logging
  console.log('Active users:', {
    presenceState,
    documentId,
    activeUsers,
    currentUserId: user?.id
  })

  // Only show if there are multiple users in this document
  if (activeUsers.length <= 1) {
    return null
  }

  const getInitial = (name: string) => {
    return name?.charAt(0).toUpperCase() || '?'
  }

  const getUserColor = (userId: string) => {
    const colors = [
      'bg-red-500',
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-orange-500'
    ]
    
    const index = Array.from(userId).reduce((acc, char) => {
      return acc + char.charCodeAt(0)
    }, 0) % colors.length
    
    return colors[index]
  }

  const handleRevokeAccess = (user: Presence) => {
    setSelectedUser(user)
    setShowRevokeDialog(true)
  }

  const getUserPopoverContent = (presence: Presence) => {
    const isCurrentUser = presence.userId === user?.id;
    
    // Get the current presence state for this user
    const currentPresence = Object.values(presenceState)
      .flat()
      .find(p => p.userId === presence.userId);
    
    // Check both the current presence state and the passed presence
    const accessMode = currentPresence?.accessMode?.toLowerCase() || presence.accessMode?.toLowerCase();
    
    // Debug log
    console.log('User access state:', {
      userId: presence.userId,
      currentPresence,
      accessMode,
      isAccessRevoked,
      isOwner,
      isCurrentUser,
      presenceState
    });

    return (
      <div className="flex flex-col p-2 min-w-[200px]">
        <div className="flex items-center gap-2">
          <Avatar>
            <AvatarImage src={presence.imageUrl} />
            <AvatarFallback>
              {presence.userName?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-medium">
              {presence.userName}
              {isCurrentUser && " (you)"}
            </span>
            <span className="text-xs text-muted-foreground">
              {accessMode === 'view' ? "View only" : "Can edit"}
            </span>
          </div>
        </div>
        
        {/* Show revoke button if:
            1. Current user is owner
            2. Not showing for current user
            3. Target user has edit access
            4. Access isn't already revoked */}
        {isOwner && 
         !isCurrentUser && 
         accessMode === 'edit' && 
         !isAccessRevoked && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleRevokeAccess(presence)}
            className="mt-2 w-full justify-start text-sm text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
          >
            Revoke edit access
          </Button>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="flex items-center">
        <div className="flex -space-x-2">
          {Object.values(presenceState).map((presences) =>
            presences.map((presence) => (
              <Popover key={presence.userId}>
                <PopoverTrigger asChild>
                  <button className="relative inline-block">
                    <Avatar className="h-8 w-8 border-2 border-background">
                      <AvatarImage src={presence.imageUrl} />
                      <AvatarFallback>
                        {presence.userName?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  {getUserPopoverContent(presence)}
                </PopoverContent>
              </Popover>
            ))
          )}
        </div>
      </div>

      <RevokeAccessDialog
        isOpen={showRevokeDialog}
        onOpenChange={setShowRevokeDialog}
        user={selectedUser}
        documentId={documentId}
      />
    </>
  )
} 