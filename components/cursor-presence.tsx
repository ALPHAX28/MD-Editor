import { Cursor } from '@/hooks/use-realtime'
import { motion } from 'framer-motion'
import { getUserColor } from './users-online'

interface CursorPresenceProps {
  cursor: Cursor
}

export function CursorPresence({ cursor }: CursorPresenceProps) {
  const userColor = getUserColor(cursor.userId)

  if (cursor.isTextCursor) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="pointer-events-none absolute"
        style={{
          left: cursor.x,
          top: cursor.y,
        }}
        transition={{ duration: 0.15 }}
      >
        <div className="relative">
          {/* Text cursor */}
          <div 
            className="w-[2px] h-[1.2em] animate-blink"
            style={{ 
              height: '1.5rem',
              marginTop: '0px',
              backgroundColor: userColor
            }} 
          />
          
          {/* Name tooltip */}
          <div 
            className="absolute left-2 -top-6 px-2 py-1 rounded whitespace-nowrap z-50 text-white text-xs"
            style={{ backgroundColor: userColor }}
          >
            {cursor.userName} is typing
          </div>
        </div>
      </motion.div>
    )
  }

  // Mouse cursor
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pointer-events-none absolute"
      style={{
        left: cursor.x,
        top: cursor.y,
      }}
      transition={{ duration: 0.15 }}
    >
      <div className="relative">
        <svg
          className="h-5 w-3"
          viewBox="0 0 24 36"
          fill="none"
          stroke="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
            fill={userColor}
          />
        </svg>

        <div 
          className="absolute left-4 top-0 px-2 py-1 rounded text-white text-xs"
          style={{ backgroundColor: userColor }}
        >
          {cursor.userName}
        </div>
      </div>
    </motion.div>
  )
} 