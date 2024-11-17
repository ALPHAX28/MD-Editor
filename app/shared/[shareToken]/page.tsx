import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs'
import { prisma } from '@/lib/prisma'
import { default as dynamicImport } from 'next/dynamic'
import { Document, SharedDocument } from '@prisma/client'

// Import the client wrapper with no SSR
const ClientMarkdownEditor = dynamicImport(
  () => import('@/components/client-wrapper').then(mod => mod.ClientMarkdownEditor),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }
)

interface DocumentWithSharedWith extends Document {
  sharedWith: SharedDocument[];
}

// Page config
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function SharedDocumentPage({ 
  params 
}: { 
  params: { shareToken: string } 
}) {
  try {
    const document = await prisma.document.findUnique({
      where: {
        shareToken: params.shareToken
      },
      include: {
        sharedWith: {
          select: {
            userId: true,
            accessMode: true
          }
        }
      }
    }) as DocumentWithSharedWith | null

    if (!document) {
      console.error('Document not found:', params.shareToken)
      redirect('/')
    }

    const { userId } = auth()
    
    if (userId && userId !== document.userId) {
      try {
        const existingShare = await prisma.sharedDocument.findFirst({
          where: {
            documentId: document.id,
            userId: userId
          }
        })

        if (!existingShare) {
          await prisma.sharedDocument.create({
            data: {
              documentId: document.id,
              userId: userId,
              accessMode: document.shareMode || 'VIEW'
            }
          })
        }
      } catch (error) {
        console.error('Error managing shared access:', error)
      }
    }

    const editorProps = {
      documentId: document.id,
      isShared: true,
      shareMode: document.shareMode?.toLowerCase() || 'view',
      initialContent: document.content || '',
      title: document.title || 'Shared Document'
    }

    return (
      <div id="shared-document-root" suppressHydrationWarning>
        <ClientMarkdownEditor {...editorProps} />
      </div>
    )
  } catch (error) {
    console.error('Error loading shared document:', error)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Error Loading Document</h1>
          <p className="text-gray-600">Unable to load the shared document. Please try again later.</p>
        </div>
      </div>
    )
  }
} 