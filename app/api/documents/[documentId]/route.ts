import { auth } from '@clerk/nextjs'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: Request,
  { params }: { params: { documentId: string } }
) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const document = await prisma.document.findFirst({
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
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    return NextResponse.json(document)
  } catch (error) {
    console.error('[DOCUMENT_GET_ERROR]', error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { documentId: string } }
) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { content, title } = await req.json()

    // First, check if the document exists and user has access
    const existingDoc = await prisma.document.findFirst({
      where: {
        id: params.documentId,
        OR: [
          { userId: userId },
          {
            sharedWith: {
              some: {
                userId: userId,
                accessMode: 'EDIT'
              }
            }
          }
        ]
      }
    })

    if (!existingDoc) {
      return NextResponse.json({ error: "Document not found or access denied" }, { status: 404 })
    }

    // Update the document
    const updatedDocument = await prisma.document.update({
      where: {
        id: params.documentId
      },
      data: {
        content,
        ...(title && { title }),
        isAutosave: false // Ensure we're not creating autosave documents
      }
    })

    console.log('Document updated:', {
      id: updatedDocument.id,
      content: updatedDocument.content?.substring(0, 50) + '...',
      userId
    })

    return NextResponse.json(updatedDocument)
  } catch (error) {
    console.error('[DOCUMENT_UPDATE_ERROR]', error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { documentId: string } }
) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const document = await prisma.document.findUnique({
      where: {
        id: params.documentId,
      }
    })

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    if (document.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await prisma.document.delete({
      where: {
        id: params.documentId,
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[DOCUMENT_DELETE]", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
} 