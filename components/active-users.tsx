import { motion, AnimatePresence } from 'framer-motion'
import { Presence } from '@/hooks/use-realtime'
import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { RevokeAccessDialog } from './revoke-access-dialog'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { Badge } from './ui/badge'

interface ActiveUsersProps {
  presenceState: Record<string, Presence[]>
  documentId?: string
  isOwner?: boolean
  shareMode?: string
}

// Function to generate a unique color based on userId
const getUserColor = (userId: string) => {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }
  const h = hash % 360
  return `hsl(${h}, 70%, 60%)`
}

export function ActiveUsers({ presenceState, documentId, isOwner, shareMode }: ActiveUsersProps) {
  const [showTooltip, setShowTooltip] = useState<string | null>(null)
  const users = Object.values(presenceState).flat()
  const MAX_VISIBLE_USERS = 5
  const { user: currentUser } = useUser()

  // Don't show anything if there's only one or no users
  if (users.length <= 1) {
    return null
  }

  // Get user avatar URL
  const getUserAvatar = (userId: string) => {
    if (currentUser && currentUser.id === userId) {
      return currentUser.imageUrl
    }
    return undefined
  }

  const handleRevoked = () => {
    // Just update the UI state if needed
  }

  // Get user's actual access mode from presence state
  const getUserAccessMode = (userId: string) => {
    const userPresence = Object.values(presenceState)
      .flat()
      .find(presence => presence.userId === userId)
    return userPresence?.accessMode || 'view'
  }

  return (
    <div className="flex items-center">
      <div className="flex -space-x-3">
        <AnimatePresence mode="popLayout">
          {users.slice(0, MAX_VISIBLE_USERS).map((presenceUser) => {
            const userAccessMode = getUserAccessMode(presenceUser.userId)
            const isEditing = userAccessMode === 'edit'
            const userColor = getUserColor(presenceUser.userId)

            return (
              <Popover key={presenceUser.userId}>
                <PopoverTrigger asChild>
                  <motion.div
                    initial={{ scale: 0, opacity: 0, x: -20 }}
                    animate={{ scale: 1, opacity: 1, x: 0 }}
                    exit={{ scale: 0, opacity: 0, x: -20 }}
                    className="relative first:ml-0 cursor-pointer"
                    style={{ zIndex: users.length }}
                    onMouseEnter={() => setShowTooltip(presenceUser.userId)}
                    onMouseLeave={() => setShowTooltip(null)}
                  >
                    <motion.div
                      className="h-8 w-8 rounded-full flex items-center justify-center border-2 border-background overflow-hidden text-white"
                      style={{ backgroundColor: userColor }}
                      whileHover={{ scale: 1.1, zIndex: 50 }}
                      transition={{ duration: 0.2 }}
                    >
                      {getUserAvatar(presenceUser.userId) ? (
                        <img 
                          src={getUserAvatar(presenceUser.userId)} 
                          alt={presenceUser.userName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-medium">
                          {presenceUser.userName?.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </motion.div>
                  </motion.div>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{presenceUser.userName}</div>
                      <Badge 
                        variant={isEditing ? 'default' : 'secondary'}
                        className="ml-2"
                      >
                        {isEditing ? 'Editing' : 'Viewing'}
                      </Badge>
                    </div>
                    {isOwner && documentId && currentUser && 
                     presenceUser.userId !== currentUser.id && 
                     isEditing && (
                      <RevokeAccessDialog
                        documentId={documentId}
                        userId={presenceUser.userId}
                        userName={presenceUser.userName}
                        onRevoked={handleRevoked}
                      />
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            )
          })}

          {/* Show count of additional users */}
          {users.length > MAX_VISIBLE_USERS && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium border-2 border-background relative"
              style={{ zIndex: 0 }}
            >
              +{users.length - MAX_VISIBLE_USERS}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
} 