'use client'

import { MarkdownEditor } from "@/components/markdown-editor"
import { usePathname } from "next/navigation"
import { useDocuments } from "@/hooks/use-documents"

export default function EditorPage() {
  const pathname = usePathname()
  const { documents } = useDocuments()
  
  return (
    <MarkdownEditor 
      redirectUrl={pathname}
      documents={documents}
    />
  )
} 