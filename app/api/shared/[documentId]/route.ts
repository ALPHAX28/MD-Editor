import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { currentUser } from '@clerk/nextjs'

export async function PATCH(
  req: Request,
  { params }: { params: { documentId: string } }
) {
  try {
    const user = await currentUser()
    const { content } = await req.json()

    // Find document and verify it exists
    const document = await prisma.document.findUnique({
      where: { id: params.documentId }
    })

    if (!document) {
      return new NextResponse("Document not found", { status: 404 })
    }

    // For edit mode, require authentication
    if (document.shareMode === 'EDIT' && !user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // If document is in view mode, don't allow updates
    if (document.shareMode === 'VIEW') {
      return new NextResponse("Document is view-only", { status: 403 })
    }

    // Update the document
    const updatedDoc = await prisma.document.update({
      where: { id: params.documentId },
      data: { 
        content,
        updatedAt: new Date()
      }
    })

    return NextResponse.json(updatedDoc)
  } catch (error) {
    console.error('[SHARED_DOCUMENT_UPDATE_ERROR]', error)
    return new NextResponse("Internal Error", { status: 500 })
  }
} 