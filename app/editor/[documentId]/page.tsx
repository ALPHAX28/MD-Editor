import { MarkdownEditor } from "@/components/markdown-editor"
import { auth } from "@clerk/nextjs"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

export default async function EditorPage({ params }: { params: { documentId: string } }) {
  const { userId } = auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  // Fetch the document
  const document = await prisma.document.findUnique({
    where: {
      id: params.documentId,
      OR: [
        { userId: userId },
        {
          sharedWith: {
            some: {
              userId: userId
            }
          }
        }
      ]
    }
  })

  if (!document) {
    redirect('/editor')
  }

  return (
    <MarkdownEditor 
      documentId={params.documentId}
      initialContent={document.content || ''}
      title={document.title}
    />
  )
} 