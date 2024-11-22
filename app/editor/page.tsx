import { MarkdownEditor } from "@/components/markdown-editor"
import { auth } from "@clerk/nextjs"
import { redirect } from "next/navigation"

export default async function EditorPage() {
  const { userId } = auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  return <MarkdownEditor />
} 