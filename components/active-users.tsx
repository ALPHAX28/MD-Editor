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
import { useState } from "react"
import { Presence } from "@/hooks/use-realtime"
import { useUser } from "@clerk/nextjs"

interface ActiveUsersProps {
  presenceState: Record<string, Presence[]>
  documentId?: string
  isOwner: boolean
  shareMode?: string
}

export function ActiveUsers({ 
  presenceState, 
  documentId,
  isOwner,
  shareMode
}: ActiveUsersProps) {
  const [selectedUser, setSelectedUser] = useState<Presence | null>(null)
  const [showRevokeDialog, setShowRevokeDialog] = useState(false)
  const { user } = useUser()

  // Get all active users
  const activeUsers = Object.values(presenceState).flat().filter(p => p.userName)
  const hasMultipleUsers = activeUsers.length > 1

  // If there's only one user (current user) and no other participants, don't show anything
  if (!hasMultipleUsers) {
    return null
  }

  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase()
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

  const renderAvatar = (presenceUser: Presence) => {
    const isCurrentUser = user && presenceUser.userId === user.id
    const userColor = getUserColor(presenceUser.userId)

    if (isCurrentUser) {
      return (
        <Avatar className="h-8 w-8 border-2 border-background">
          <AvatarImage src={user.imageUrl} />
          <AvatarFallback className={`${userColor} text-white`}>
            {getInitial(presenceUser.userName)}
          </AvatarFallback>
        </Avatar>
      )
    }

    return (
      <Avatar className={`h-8 w-8 border-2 border-background ${userColor}`}>
        <AvatarFallback className={`${userColor} text-white`}>
          {getInitial(presenceUser.userName)}
        </AvatarFallback>
      </Avatar>
    )
  }

  return (
    <>
      <div className="flex items-center">
        <div className="flex -space-x-3">
          <AnimatePresence mode="popLayout">
            {activeUsers.map((presenceUser) => (
              <Popover key={presenceUser.userId}>
                <PopoverTrigger asChild>
                  <motion.div
                    initial={{ scale: 0, opacity: 0, x: -20 }}
                    animate={{ scale: 1, opacity: 1, x: 0 }}
                    exit={{ scale: 0, opacity: 0, x: 20 }}
                    className="relative inline-block"
                  >
                    {renderAvatar(presenceUser)}
                  </motion.div>
                </PopoverTrigger>
                <PopoverContent className="w-52 p-2" align="start">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      {renderAvatar(presenceUser)}
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">{presenceUser.userName}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {presenceUser.accessMode || 'Viewing'}
                        </p>
                      </div>
                    </div>
                    {isOwner && presenceUser.accessMode === 'edit' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-muted-foreground"
                        onClick={() => handleRevokeAccess(presenceUser)}
                      >
                        <MoreHorizontal className="mr-2 h-4 w-4" />
                        Manage access
                      </Button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            ))}
          </AnimatePresence>
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