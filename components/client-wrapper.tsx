'use client'

import { MarkdownEditor } from './markdown-editor'
import type { MarkdownEditorProps } from '@/types'
import { useEffect, useState } from 'react'
import { Providers } from '@/components/providers'

export function ClientMarkdownEditor(props: MarkdownEditorProps) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <Providers>
      <div className="h-screen w-full relative">
        <MarkdownEditor {...props} />
      </div>
    </Providers>
  )
} 