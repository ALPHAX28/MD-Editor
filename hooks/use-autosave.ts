import { useState, useEffect, useCallback } from 'react'
import { useToast } from './use-toast'

export type SaveStatus = 'saved' | 'saving' | 'error'

export function useAutosave(
  documentId: string | undefined,
  initialContent: string = '',
  isShared: boolean = false,
  shareMode: string = 'private'
) {
  const [content, setContent] = useState(initialContent)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const { toast } = useToast()

  // Reset save status when switching to view mode
  useEffect(() => {
    if (isShared && shareMode === 'view') {
      setSaveStatus('saved')
    }
  }, [isShared, shareMode])

  const saveContent = useCallback(async () => {
    // Don't attempt to save if in view mode
    if (!documentId || (isShared && shareMode === 'view')) {
      setSaveStatus('saved')
      return
    }

    setSaveStatus('saving')

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          content,
          isAutosave: true
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save')
      }

      const savedDoc = await response.json()
      setLastSaved(new Date())
      setSaveStatus('saved')
    } catch (error) {
      console.error('Save error:', error)
      setSaveStatus('error')
      toast({
        title: "Error",
        description: "Failed to save changes",
        variant: "destructive"
      })
    }
  }, [content, documentId, isShared, shareMode])

  // Save when content changes
  useEffect(() => {
    // Don't set up autosave if in view mode
    if (!content || !documentId || (isShared && shareMode === 'view')) {
      return
    }

    const timeoutId = setTimeout(() => {
      saveContent()
    }, 2000)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [content, documentId, saveContent, isShared, shareMode])

  // Load initial content
  useEffect(() => {
    if (documentId) {
      const loadContent = async () => {
        try {
          const response = await fetch(`/api/documents/${documentId}`)
          if (!response.ok) throw new Error('Failed to load document')
          const data = await response.json()
          setContent(data.content || '')
          // Set status to saved after loading content in view mode
          if (isShared && shareMode === 'view') {
            setSaveStatus('saved')
          }
        } catch (error) {
          console.error('Error loading document:', error)
          toast({
            title: "Error",
            description: "Failed to load document",
            variant: "destructive"
          })
        }
      }
      loadContent()
    }
  }, [documentId, isShared, shareMode])

  // Save before unloading - only if not in view mode
  useEffect(() => {
    if (isShared && shareMode === 'view') return

    const handleBeforeUnload = () => {
      if (content && documentId) {
        saveContent()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [content, documentId, saveContent, isShared, shareMode])

  return {
    content,
    setContent,
    lastSaved,
    saveStatus: (isShared && shareMode === 'view') ? undefined : saveStatus,
    setLastSaved,
    setSaveStatus
  }
} 