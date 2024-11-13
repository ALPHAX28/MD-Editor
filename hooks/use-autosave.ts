import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'

export type SaveStatus = 'saved' | 'saving' | 'error' | 'idle'

export function useAutosave(documentId?: string) {
  const [content, setContent] = useState('')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const { isSignedIn, userId } = useAuth()

  // Load content when component mounts or documentId changes
  useEffect(() => {
    const loadContent = async () => {
      if (!isSignedIn || !userId) return

      try {
        setSaveStatus('saving')
        const endpoint = documentId 
          ? `/api/documents/${documentId}`
          : '/api/documents/autosave'
        
        const response = await fetch(endpoint)
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to load document')
        }
        
        const data = await response.json()
        if (data?.content) {
          setContent(data.content)
          setLastSaved(new Date(data.updatedAt))
          setSaveStatus('saved')
        }
      } catch (error) {
        console.error('Failed to load document:', error)
        setSaveStatus('error')
      }
    }

    loadContent()
  }, [isSignedIn, userId, documentId])

  // Autosave effect
  useEffect(() => {
    if (!content || !isSignedIn || !userId) return

    const saveContent = async () => {
      setSaveStatus('saving')
      
      try {
        const endpoint = documentId 
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
        setSaveStatus('error')
        // Optionally show a toast or notification here
      }
    }

    const timeoutId = setTimeout(saveContent, 1000)
    return () => clearTimeout(timeoutId)
  }, [content, isSignedIn, userId, documentId])

  return { content, setContent, lastSaved, saveStatus }
} 