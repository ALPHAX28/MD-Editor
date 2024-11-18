import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth, useUser } from '@clerk/nextjs'
import { useToast } from '@/hooks/use-toast'

export interface Cursor {
  x: number
  y: number
  userId: string
  userName: string
  imageUrl?: string
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
  imageUrl?: string
  documentId?: string
  lastSeen?: string
  isActive?: boolean
}

type RealtimePresence = {
  presence: Presence
  userId: string
  userName: string
  cursor: Cursor | null
  accessMode?: 'edit' | 'view'
  imageUrl?: string
  documentId?: string
  lastSeen?: string
  isActive?: boolean
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

  // Add cleanup function for presence
  const cleanup = () => {
    if (channelRef.current) {
      console.log('Cleaning up channel subscription')
      channelRef.current.untrack() // Add this to remove presence
      channelRef.current.unsubscribe()
      channelRef.current = null
      setIsChannelReady(false)
      setCursors(new Map()) // Clear cursors
      setPresenceState({}) // Clear presence state
    }
  }

  useEffect(() => {
    if (!isLoaded || !documentId) return

    // Cleanup previous channel before creating new one
    cleanup()

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
        const state = channel.presenceState<RealtimePresence>()
        const typedState: Record<string, Presence[]> = {}
        
        // Convert RealtimePresence to Presence
        Object.entries(state).forEach(([key, value]) => {
          typedState[key] = value.map(v => ({
            userId: v.userId,
            userName: v.userName,
            cursor: v.cursor,
            accessMode: v.accessMode,
            imageUrl: v.imageUrl,
            documentId: v.documentId,
            lastSeen: v.lastSeen,
            isActive: v.isActive
          }))
        })
        
        setPresenceState(typedState)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', { key, newPresences })
        if (key !== userId && newPresences?.[0]) {
          const presence = {
            userId: newPresences[0].userId || '',
            userName: newPresences[0].userName || '',
            cursor: newPresences[0].cursor || null,
            accessMode: newPresences[0].accessMode,
            imageUrl: newPresences[0].imageUrl,
            documentId: newPresences[0].documentId,
            lastSeen: newPresences[0].lastSeen,
            isActive: newPresences[0].isActive
          } as Presence

          toast({
            title: "User joined",
            description: `${presence.userName} has joined the session`,
            duration: 3000,
          })
        }
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', { key, leftPresences })
        if (key !== userId && leftPresences?.[0]) {
          const presence = {
            userId: leftPresences[0].userId || '',
            userName: leftPresences[0].userName || '',
            cursor: leftPresences[0].cursor || null,
            accessMode: leftPresences[0].accessMode,
            imageUrl: leftPresences[0].imageUrl,
            documentId: leftPresences[0].documentId,
            lastSeen: leftPresences[0].lastSeen,
            isActive: leftPresences[0].isActive
          } as Presence

          toast({
            title: "User left",
            description: `${presence.userName} has left the session`,
            duration: 3000,
          })
        }
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
          const presenceData = {
            userId: userId,
            userName: user.fullName || user.username || 'Anonymous',
            imageUrl: user.imageUrl,
            accessMode: shareMode,
            cursor: null,
            documentId,
            lastSeen: new Date().toISOString(),
            isActive: true
          }

          console.log('Tracking presence:', presenceData)
          
          try {
            await channel.track(presenceData)
            console.log('Successfully tracked presence')
          } catch (error) {
            console.error('Failed to track presence:', error)
          }
        }
      }
    })

    return () => {
      cleanup()
    }
  }, [documentId, userId, isLoaded, user, shareMode]) // Add user to dependencies

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
          imageUrl: user.imageUrl,
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

  // Update the getCaretCoordinates function
  function getCaretCoordinates(textarea: HTMLTextAreaElement, position: number) {
    const text = textarea.value.substring(0, position)
    const lines = text.split('\n')
    const currentLine = lines.length - 1
    const currentLineText = lines[currentLine]
    const style = window.getComputedStyle(textarea)
    
    // Get exact measurements
    const lineHeight = parseFloat(style.lineHeight)
    const paddingTop = parseFloat(style.paddingTop)
    const paddingLeft = parseFloat(style.paddingLeft)
    const fontSize = parseFloat(style.fontSize)
    const charWidth = fontSize * 0.550 // Approximate width of monospace character

    // Calculate wrapped lines before current position
    const textareaWidth = textarea.clientWidth - (paddingLeft * 2)
    const charsPerLine = Math.floor(textareaWidth / charWidth)
    
    // Calculate wrapping for current line
    const wrappedLines = Math.floor(currentLineText.length / charsPerLine)
    const totalLines = currentLine + wrappedLines
    
    // Calculate cursor position
    const linePosition = totalLines * lineHeight
    const columnPosition = (currentLineText.length % charsPerLine) * charWidth

    return {
      left: columnPosition + paddingLeft,
      top: linePosition + paddingTop,
      line: currentLine,
      column: currentLineText.length
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