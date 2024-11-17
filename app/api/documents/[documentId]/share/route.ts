import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { prisma } from '@/lib/prisma'
import { nanoid } from 'nanoid'

export async function POST(
  req: Request,
  { params }: { params: { documentId: string } }
) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { mode } = await req.json()

    // Verify document ownership
    const document = await prisma.document.findUnique({
      where: {
        id: params.documentId,
        userId: userId
      }
    })

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Generate a unique share token
    const shareToken = nanoid()

    // Update document with share settings
    const updatedDocument = await prisma.document.update({
      where: {
        id: params.documentId
      },
      data: {
        shareToken: shareToken,
        shareMode: mode.toUpperCase(),
        sharedWith: {
          deleteMany: {}, // Reset shared access
        }
      }
    })

    return NextResponse.json({
      shareToken: updatedDocument.shareToken,
      mode: updatedDocument.shareMode
    })
  } catch (error) {
    console.error('[SHARE_ERROR]', error)
    return NextResponse.json(
      { error: "Internal Server Error" }, 
      { status: 500 }
    )
  }
} 