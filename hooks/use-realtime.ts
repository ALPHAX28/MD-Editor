import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth, useUser } from '@clerk/nextjs'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'

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

export function useRealtime(documentId: string, shareMode?: string, isOwner?: boolean) {
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
  const [isAccessRevoked, setIsAccessRevoked] = useState(false)
  const [currentAccessMode, setCurrentAccessMode] = useState(shareMode)
  const router = useRouter()

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

  // Move updatePresenceState function definition here
  const updatePresenceState = (targetUserId: string, newAccessMode: 'view' | 'edit') => {
    setPresenceState(prev => {
      const newState = { ...prev };
      Object.keys(newState).forEach(key => {
        newState[key] = newState[key].map(presence => {
          if (presence.userId === targetUserId) {
            return {
              ...presence,
              accessMode: newAccessMode
            };
          }
          return presence;
        });
      });
      return newState;
    });
  };

  // Add this function to update presence for a specific user
  const updateUserPresenceAndUI = (targetUserId: string, newAccessMode: 'view' | 'edit') => {
    // Update presence state
    setPresenceState(prev => {
      const newState = { ...prev };
      Object.keys(newState).forEach(key => {
        newState[key] = newState[key].map(presence => {
          if (presence.userId === targetUserId) {
            return {
              ...presence,
              accessMode: newAccessMode
            };
          }
          return presence;
        });
      });
      return newState;
    });

    // If current user is the owner, update their UI state
    if (isOwner) {
      setCurrentAccessMode(newAccessMode);
      // Force a re-render of the presence state
      setTimeout(() => {
        setPresenceState(prev => ({...prev}));
      }, 0);
    }
  };

  // Add this function to handle UI updates
  const handleAccessRevocation = (targetUserId: string) => {
    // Update presence state
    setPresenceState(prev => {
      const newState = { ...prev };
      Object.keys(newState).forEach(key => {
        newState[key] = newState[key].map(presence => {
          if (presence.userId === targetUserId) {
            return {
              ...presence,
              accessMode: 'view'
            };
          }
          return presence;
        });
      });
      return newState;
    });

    // Update cursors if needed
    setCursors(prev => {
      const newCursors = new Map(prev);
      if (newCursors.has(targetUserId)) {
        newCursors.delete(targetUserId);
      }
      return newCursors;
    });
  };

  // Add this function to force UI updates
  const forceUIUpdate = (targetUserId: string) => {
    // Update presence state
    setPresenceState(prev => {
      const newState = { ...prev };
      Object.keys(newState).forEach(key => {
        newState[key] = newState[key].map(presence => {
          if (presence.userId === targetUserId) {
            return {
              ...presence,
              accessMode: 'view'
            };
          }
          return presence;
        });
      });
      return newState;
    });

    // Force re-render by updating currentAccessMode
    if (targetUserId === userId) {
      setCurrentAccessMode('view');
      setIsAccessRevoked(true);
    }
  };

  // Add this function to the useRealtime hook
  const removeCursor = useCallback(() => {
    if (!channelRef.current || !userId) return;

    channelRef.current.send({
      type: 'broadcast',
      event: 'cursor_remove',
      payload: { userId }
    });
  }, [userId]);

  useEffect(() => {
    if (!isLoaded || !documentId) return;

    // Cleanup previous channel before creating new one
    cleanup();

    const channelName = `document:${documentId}`;
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: true, ack: true },
        presence: { key: userId || 'anonymous' }
      }
    });

    channelRef.current = channel;

    // Add all channel event handlers here
    channel
      .on('broadcast', { event: 'content' }, ({ payload }) => {
        const now = Date.now()
        if (now - lastUpdateTime.current < MIN_UPDATE_INTERVAL) {
          return // Skip updates that are too close together
        }
        
        if (payload.userId !== userId && payload.documentId === documentId) {
          setContent(prev => {
            if (prev !== payload.content) {
              return payload.content;
            }
            return prev;
          });
          lastUpdateTime.current = now;
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
        console.log('Received access_revoked event:', payload);

        // Force UI update immediately
        forceUIUpdate(payload.targetUserId);

        // If current user is the target
        if (payload.targetUserId === userId) {
          if (channelRef.current) {
            channelRef.current.track({
              userId,
              userName: user?.fullName || user?.username || 'Anonymous',
              imageUrl: user?.imageUrl,
              accessMode: 'view',
              cursor: null,
              documentId,
              lastSeen: new Date().toISOString(),
              isActive: true
            });
          }

          toast({
            title: "Access Revoked",
            description: "Your edit access has been revoked. You can now only view this document.",
            variant: "destructive",
          });
        }
        // If current user is the owner
        else if (payload.ownerId === userId) {
          // Force immediate UI update for owner's view
          setPresenceState(prev => {
            const newState = { ...prev };
            // Update the specific user's access mode
            Object.keys(newState).forEach(key => {
              newState[key] = newState[key].map(presence => {
                if (presence.userId === payload.targetUserId) {
                  return {
                    ...presence,
                    accessMode: 'view'
                  };
                }
                return presence;
              });
            });
            return newState;
          });

          // Force a re-render
          setTimeout(() => {
            setPresenceState(prev => ({...prev}));
          }, 0);

          toast({
            title: "Access Updated",
            description: "User's access has been revoked successfully.",
            duration: 3000,
          });
        }

        // Broadcast presence update to all clients
        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'presence_sync',
            payload: {
              userId: payload.targetUserId,
              accessMode: 'view',
              timestamp: new Date().toISOString()
            }
          });
        }
      })
      .on('broadcast', { event: 'presence_update' }, ({ payload }) => {
        updatePresenceState(payload.userId, payload.accessMode as 'view' | 'edit');
      })
      .on('broadcast', { event: 'presence_sync' }, ({ payload }) => {
        handleAccessRevocation(payload.userId);
      })
      .on('broadcast', { event: 'cursor_remove' }, ({ payload }) => {
        setCursors(prev => {
          const newCursors = new Map(prev);
          newCursors.delete(payload.userId);
          return newCursors;
        });
      });

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
  }, [documentId, userId, isLoaded, user, shareMode, toast])

  const updateCursor = async (cursor: Omit<Cursor, 'userId' | 'userName'>) => {
    if (!documentId || !user || !channelRef.current || !userId || isAccessRevoked) return

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
    if (!isChannelReady || !channelRef.current || isAccessRevoked || !documentId) {
      return;
    }

    try {
      // Update local content immediately
      setContent(newContent);

      // Debounce the broadcast and save operations
      if (updateTimeout.current) {
        clearTimeout(updateTimeout.current);
      }

      updateTimeout.current = setTimeout(async () => {
        try {
          // Add document ID to the broadcast payload
          await channelRef.current?.send({
            type: 'broadcast',
            event: 'content',
            payload: {
              content: newContent,
              userId: userId || 'anonymous',
              timestamp: new Date().toISOString(),
              documentId: documentId // Ensure documentId is included
            }
          });

          // Save to database with explicit document ID check
          const response = await fetch(`/api/documents/${documentId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              content: newContent,
              documentId: documentId // Include documentId in the body
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to save document');
          }

          lastUpdateTime.current = Date.now();
        } catch (error) {
          console.error('Error saving/broadcasting content:', error);
          toast({
            title: "Error",
            description: "Failed to sync changes",
            variant: "destructive"
          });
        }
      }, 300);

    } catch (error) {
      console.error('Error updating content:', error);
    }
  };

  useEffect(() => {
    console.log('Content state changed:', content)
  }, [content])

  const clearPresence = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.untrack();
      cursors.clear();
      setPresenceState({});
    }
  }, []);

  // Add this effect to handle logout cleanup
  useEffect(() => {
    if (!isSignedIn && channelRef.current) {
      // Clear cursor and unsubscribe from channel when user logs out
      if (userId) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'cursor_remove',
          payload: { userId }
        });
      }
      cleanup();
    }
  }, [isSignedIn, userId]);

  return {
    cursors,
    selections,
    content,
    updateCursor,
    updateContent,
    isChannelReady,
    presenceState,
    isAccessRevoked,
    currentAccessMode,
    clearPresence,
    removeCursor,
  }
} 