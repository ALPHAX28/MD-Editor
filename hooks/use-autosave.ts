import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'

const LOCAL_STORAGE_KEY = 'md-editor-autosave'

export type SaveStatus = 'saved' | 'saving' | 'error' | 'idle'

export function useAutosave(initialContent: string = '') {
  const [content, setContent] = useState(initialContent)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const { isSignedIn, userId } = useAuth()

  // Load content when component mounts
  useEffect(() => {
    const loadContent = async () => {
      if (isSignedIn && userId) {
        try {
          setSaveStatus('saving')
          const response = await fetch(`/api/documents/autosave`)
          if (response.ok) {
            const data = await response.json()
            if (data?.content) {
              setContent(data.content)
              setLastSaved(new Date(data.updatedAt))
              setSaveStatus('saved')
              localStorage.removeItem(LOCAL_STORAGE_KEY)
              return
            }
          }
          setSaveStatus('error')
        } catch (error) {
          console.error('Failed to load from API:', error)
          setSaveStatus('error')
        }
      }

      // Fall back to local storage
      const savedContent = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (savedContent) {
        setContent(savedContent)
        setSaveStatus('saved')
      }
    }

    loadContent()
  }, [isSignedIn, userId])

  // Autosave effect
  useEffect(() => {
    if (!content) return

    const saveContent = async () => {
      setSaveStatus('saving')
      
      // Always save to local storage
      localStorage.setItem(LOCAL_STORAGE_KEY, content)

      // If signed in, also save to API
      if (isSignedIn && userId) {
        try {
          const response = await fetch('/api/documents/autosave', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content }),
          })

          if (response.ok) {
            setLastSaved(new Date())
            setSaveStatus('saved')
          } else {
            setSaveStatus('error')
          }
        } catch (error) {
          console.error('Failed to save to API:', error)
          setSaveStatus('error')
        }
      } else {
        // For non-signed-in users, mark as saved after local storage
        setSaveStatus('saved')
      }
    }

    // Debounce the save operation
    const timeoutId = setTimeout(saveContent, 1000)
    return () => clearTimeout(timeoutId)
  }, [content, isSignedIn, userId])

  return {
    content,
    setContent,
    lastSaved,
    saveStatus
  }
} 