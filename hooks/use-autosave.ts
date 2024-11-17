import { useState, useEffect, useCallback } from 'react'
import { useToast } from './use-toast'

export function useAutosave(
  documentId: string | undefined,
  initialContent: string = '',
  isShared: boolean = false,
  shareMode: string = 'private'
) {
  const [content, setContent] = useState(initialContent)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved')
  const { toast } = useToast()

  // Load initial content
  useEffect(() => {
    if (documentId) {
      const loadContent = async () => {
        try {
          const response = await fetch(`/api/documents/${documentId}`)
          if (!response.ok) throw new Error('Failed to load document')
          const data = await response.json()
          setContent(data.content || '')
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
  }, [documentId])

  const saveContent = useCallback(async () => {
    if (!documentId || (isShared && shareMode === 'view')) return

    setSaveStatus('saving')
    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          content,
          isAutosave: false
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save')
      }

      const savedDoc = await response.json()
      console.log('Document saved:', {
        id: savedDoc.id,
        content: savedDoc.content?.substring(0, 50) + '...'
      })

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

  // Save immediately when content changes
  useEffect(() => {
    if (!content || !documentId) return
    saveContent()
  }, [content, saveContent, documentId])

  // Save before unloading
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (content && documentId) {
        saveContent()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [content, documentId, saveContent])

  return {
    content,
    setContent,
    lastSaved,
    saveStatus,
    setLastSaved,
    setSaveStatus
  }
} 