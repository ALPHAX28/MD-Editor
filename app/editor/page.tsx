'use client'

import { MarkdownEditor } from "@/components/markdown-editor"
import { usePathname } from "next/navigation"

export default function EditorPage() {
  const pathname = usePathname()
  
  return (
    <MarkdownEditor 
      redirectUrl={pathname}
    />
  )
} 