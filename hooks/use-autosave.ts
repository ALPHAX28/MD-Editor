import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'

export type SaveStatus = 'saved' | 'saving' | 'error' | 'idle'

export function useAutosave(
  documentId?: string, 
  initialContent: string = '',
  isShared: boolean = false,
  shareMode: string = 'private'
) {
  const [content, setContent] = useState(initialContent)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const { isSignedIn, userId } = useAuth()

  // Load content when component mounts or documentId changes
  useEffect(() => {
    const loadContent = async () => {
      if (!documentId) return

      try {
        const endpoint = `/api/documents/${documentId}`
        
        const response = await fetch(endpoint)
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to load document')
        }
        
        const data = await response.json()
        if (data?.content) {
          setContent(data.content)
          setLastSaved(new Date(data.updatedAt))
        }
      } catch (error) {
        console.error('Failed to load document:', error)
      }
    }

    // Only load if no initial content was provided
    if (!initialContent) {
      loadContent()
    }
  }, [documentId, initialContent])

  // Autosave effect
  useEffect(() => {
    // Don't autosave if:
    // 1. No content changes
    // 2. Shared document in view mode
    // 3. Shared document in edit mode but user not signed in
    if (!content || 
        (isShared && shareMode === 'view') || 
        (isShared && shareMode === 'edit' && !isSignedIn)) {
      return
    }

    const saveContent = async () => {
      setSaveStatus('saving')
      
      try {
        // Use different endpoint for shared documents
        const endpoint = isShared
          ? `/api/shared/${documentId}`
          : documentId 
            ? `/api/documents/${documentId}`
            : '/api/documents/autosave'
        
        const method = documentId ? 'PATCH' : 'POST'
        
        const response = await fetch(endpoint, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to save document')
        }

        const data = await response.json()
        setLastSaved(new Date(data.updatedAt))
        setSaveStatus('saved')
      } catch (error) {
        console.error('Failed to save document:', error)
        setSaveStatus(isShared ? 'idle' : 'error')
      }
    }

    const timeoutId = setTimeout(saveContent, 1000)
    return () => clearTimeout(timeoutId)
  }, [content, isSignedIn, userId, documentId, isShared, shareMode])

  // Add keyboard shortcut for manual save
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.altKey && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (!content || !isSignedIn || !userId) return

        setSaveStatus('saving')
        try {
          const endpoint = isShared
            ? `/api/shared/${documentId}`
            : documentId 
              ? `/api/documents/${documentId}`
              : '/api/documents/autosave'
          
          const method = documentId ? 'PATCH' : 'POST'
          
          const response = await fetch(endpoint, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content }),
          })

          if (!response.ok) {
            throw new Error('Failed to save document')
          }

          const data = await response.json()
          setLastSaved(new Date(data.updatedAt))
          setSaveStatus('saved')
        } catch (error) {
          console.error('Failed to save document:', error)
          setSaveStatus(isShared ? 'idle' : 'error')
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [content, isSignedIn, userId, documentId, isShared])

  return { 
    content, 
    setContent, 
    lastSaved, 
    setLastSaved, 
    saveStatus,
    setSaveStatus 
  }
} 