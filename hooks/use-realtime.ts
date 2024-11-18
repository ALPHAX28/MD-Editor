import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth, useUser } from '@clerk/nextjs'
import { useToast } from '@/hooks/use-toast'

export interface Cursor {
  x: number
  y: number
  userId: string
  userName: string
  isTextCursor: boolean
  selection: {
    start: number
    end: number
    text: string
    line: number
    column: number
  }
}

export interface Presence {
  userId: string
  userName: string
  cursor: Cursor | null
  accessMode?: 'edit' | 'view'
}

export function useRealtime(documentId: string, shareMode?: string) {
  const { isLoaded, isSignedIn, userId } = useAuth()
  const { user } = useUser()
  const [cursors, setCursors] = useState<Map<string, Cursor>>(new Map())
  const [content, setContent] = useState<string>('')
  const { toast } = useToast()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const [isChannelReady, setIsChannelReady] = useState(false)
  const [selections, setSelections] = useState<Map<string, Cursor['selection']>>(new Map())
  const [presenceState, setPresenceState] = useState<Record<string, Presence[]>>({})
  const updateTimeout = useRef<NodeJS.Timeout>()
  const lastUpdateTime = useRef<number>(0)
  const MIN_UPDATE_INTERVAL = 100 // Minimum time between updates in ms

  useEffect(() => {
    if (!isLoaded) {
      console.log('Waiting for auth to load...')
      return
    }

    if (!documentId) {
      console.error('No document ID provided for realtime')
      return
    }

    const channelName = `document:${documentId}`
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false, ack: true },
        presence: { key: userId || 'anonymous' }
      }
    })

    channelRef.current = channel

    channel
      .on('broadcast', { event: 'content' }, ({ payload }) => {
        const now = Date.now()
        if (now - lastUpdateTime.current < MIN_UPDATE_INTERVAL) {
          return // Skip updates that are too close together
        }
        
        if (payload.userId !== userId) { // Only update if from another user
          setContent(payload.content)
          lastUpdateTime.current = now
        }
      })
      .on('broadcast', { event: 'cursor' }, ({ payload }) => {
        if (payload.userId !== userId) {
          setCursors(prev => {
            const newCursors = new Map(prev)
            newCursors.set(payload.userId, payload)
            return newCursors
          })
        }
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<Presence>()
        setPresenceState(state)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        if (key !== userId) {
          toast({
            title: "User joined",
            description: `${newPresences[0].userName} has joined the session`,
            duration: 3000,
          })
        }
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        if (key !== userId) {
          toast({
            title: "User left",
            description: `${leftPresences[0].userName} has left the session`,
            duration: 3000,
          })
        }
        setCursors(prev => {
          const next = new Map(prev)
          next.delete(key)
          return next
        })
      })
      .on('broadcast', { event: 'access_revoked' }, ({ payload }) => {
        console.log('Received access_revoked event:', payload)
        if (payload.targetUserId === userId) {
          toast({
            title: "Access Revoked",
            description: "Your edit access has been revoked. The page will refresh.",
            variant: "destructive",
          })
          
          setTimeout(() => {
            window.location.href = '/editor'
            window.location.reload()
          }, 1500)
        }
      })

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setIsChannelReady(true)
        
        // Track presence when subscribed
        if (userId && user) {
          await channel.track({
            userId: userId,
            userName: user.fullName || user.username || 'Anonymous',
            cursor: null,
            accessMode: shareMode,
            imageUrl: user.imageUrl // Add user's image URL
          })
        }
      }
    })

    return () => {
      if (updateTimeout.current) {
        clearTimeout(updateTimeout.current)
      }
      if (channelRef.current) {
        console.log('Cleaning up channel subscription')
        setIsChannelReady(false)
        channelRef.current.unsubscribe()
        channelRef.current = null
      }
    }
  }, [documentId, userId, isLoaded])

  const updateCursor = async (cursor: Omit<Cursor, 'userId' | 'userName'>) => {
    if (!documentId || !user || !channelRef.current || !userId) return

    try {
      const textarea = document.querySelector('textarea')
      if (!textarea) return

      if (cursor.isTextCursor) {
        const cursorCoords = getCaretCoordinates(textarea, textarea.selectionEnd)
        
        const payload = {
          ...cursor,
          userId,
          userName: user.fullName || user.username,
          isTextCursor: true,
          x: cursorCoords.left,
          y: cursorCoords.top,
          selection: {
            start: cursor.selection.start,
            end: cursor.selection.end,
            text: textarea.value.substring(cursor.selection.start, cursor.selection.end),
            line: cursorCoords.line,
            column: cursorCoords.column
          }
        }

        await channelRef.current.send({
          type: 'broadcast',
          event: 'cursor',
          payload
        })
      } else {
        await channelRef.current.send({
          type: 'broadcast',
          event: 'cursor',
          payload: {
            ...cursor,
            userId,
            userName: user.fullName || user.username,
            isTextCursor: false
          }
        })
      }
    } catch (error) {
      console.error('Error updating cursor:', error)
    }
  }

  // Helper function to get exact caret coordinates
  function getCaretCoordinates(textarea: HTMLTextAreaElement, position: number) {
    const text = textarea.value
    const beforeText = text.substring(0, position)
    const lines = beforeText.split('\n')
    const currentLine = lines.length - 1
    const currentLineStart = text.lastIndexOf('\n', position - 1) + 1
    const column = position - currentLineStart

    // Get textarea's computed styles
    const styles = window.getComputedStyle(textarea)
    const lineHeight = parseFloat(styles.lineHeight)
    const paddingTop = parseFloat(styles.paddingTop)
    const paddingLeft = parseFloat(styles.paddingLeft)
    const fontSize = parseFloat(styles.fontSize)

    // Calculate exact position
    const charWidth = fontSize * 0.6 // Monospace font character width
    const x = (column * charWidth) + paddingLeft
    const y = (currentLine * lineHeight) + paddingTop

    return {
      left: x,
      top: y,
      line: currentLine,
      column: column
    }
  }

  const updateContent = async (newContent: string) => {
    if (!isChannelReady || !channelRef.current) {
      console.log('Channel not ready:', {
        isChannelReady,
        hasChannel: !!channelRef.current
      })
      return
    }

    try {
      // Add debouncing to prevent rapid updates
      if (updateTimeout.current) {
        clearTimeout(updateTimeout.current)
      }

      updateTimeout.current = setTimeout(async () => {
        console.log('Broadcasting content:', {
          content: newContent,
          channelName: `document:${documentId}`,
          userId
        })

        const result = await channelRef.current?.send({
          type: 'broadcast',
          event: 'content',
          payload: {
            content: newContent,
            userId: userId || 'anonymous',
            timestamp: new Date().toISOString(),
            documentId
          }
        })

        console.log('Broadcast result:', result)
      }, 100) // Debounce time of 100ms
    } catch (error) {
      console.error('Error broadcasting content:', error)
      toast({
        title: "Error",
        description: "Failed to sync changes",
        variant: "destructive"
      })
    }
  }

  useEffect(() => {
    console.log('Content state changed:', content)
  }, [content])

  return {
    cursors,
    selections,
    content,
    updateCursor,
    updateContent,
    isChannelReady,
    presenceState
  }
} 