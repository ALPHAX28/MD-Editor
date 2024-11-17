import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users } from 'lucide-react'
import { Presence } from '@/hooks/use-realtime'

interface UsersOnlineProps {
  presenceState: Record<string, Presence[]>
}

export function UsersOnline({ presenceState }: UsersOnlineProps) {
  const [showList, setShowList] = useState(false)
  const users = Object.values(presenceState).flat()
  
  return (
    <div className="relative">
      <motion.div
        whileHover={{ scale: 1.05 }}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 cursor-pointer"
        onClick={() => setShowList(!showList)}
      >
        <Users className="h-4 w-4" />
        <span className="text-sm font-medium">{users.length} online</span>
      </motion.div>

      <AnimatePresence>
        {showList && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full mt-2 right-0 bg-popover border rounded-lg shadow-lg p-2 min-w-[200px]"
          >
            {users.map((user) => (
              <div 
                key={user.userId}
                className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted"
              >
                <div 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: getUserColor(user.userId) }}
                />
                <span className="text-sm">{user.userName}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Generate consistent colors for users
export function getUserColor(userId: string): string {
  // Generate a hash from userId
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  // Convert hash to HSL color
  const h = hash % 360
  return `hsl(${h}, 70%, 50%)`
} 