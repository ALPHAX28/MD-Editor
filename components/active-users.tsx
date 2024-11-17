import { motion, AnimatePresence } from 'framer-motion'
import { Presence } from '@/hooks/use-realtime'
import { useState } from 'react'
import { useUser } from '@clerk/nextjs'

interface ActiveUsersProps {
  presenceState: Record<string, Presence[]>
}

export function ActiveUsers({ presenceState }: ActiveUsersProps) {
  const [showTooltip, setShowTooltip] = useState<string | null>(null)
  const users = Object.values(presenceState).flat()
  const MAX_VISIBLE_USERS = 5
  const { user } = useUser()

  // Get user avatar URL
  const getUserAvatar = (userId: string) => {
    // If it's the current user, use their avatar
    if (user && user.id === userId) {
      return user.imageUrl
    }
    // For other users, return undefined and let it fall back to initials
    return undefined
  }

  return (
    <div className="flex items-center">
      <div className="flex -space-x-3">
        <AnimatePresence mode="popLayout">
          {users.slice(0, MAX_VISIBLE_USERS).map((user) => (
            <motion.div
              key={user.userId}
              initial={{ scale: 0, opacity: 0, x: -20 }}
              animate={{ scale: 1, opacity: 1, x: 0 }}
              exit={{ scale: 0, opacity: 0, x: -20 }}
              className="relative first:ml-0"
              style={{ zIndex: users.length }}
              onMouseEnter={() => setShowTooltip(user.userId)}
              onMouseLeave={() => setShowTooltip(null)}
            >
              <motion.div
                className="h-8 w-8 rounded-full flex items-center justify-center border-2 border-background overflow-hidden bg-primary text-primary-foreground"
                whileHover={{ scale: 1.1, zIndex: 50 }}
                transition={{ duration: 0.2 }}
              >
                {getUserAvatar(user.userId) ? (
                  <img 
                    src={getUserAvatar(user.userId)} 
                    alt={user.userName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-medium">
                    {user.userName?.charAt(0).toUpperCase()}
                  </span>
                )}
              </motion.div>

              {/* Tooltip */}
              <AnimatePresence>
                {showTooltip === user.userId && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-black rounded text-white text-xs whitespace-nowrap z-50"
                  >
                    {user.userName}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}

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