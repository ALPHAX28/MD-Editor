import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: Request,
  { params }: { params: { shareToken: string } }
) {
  try {
    const document = await prisma.document.findUnique({
      where: {
        shareToken: params.shareToken
      },
      select: {
        id: true,
        title: true,
        content: true,
        shareMode: true,
        userId: true
      }
    })

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    return NextResponse.json(document)
  } catch (error) {
    console.error('[SHARED_DOCUMENT_ERROR]', error)
    return NextResponse.json(
      { error: "Internal Server Error" }, 
      { status: 500 }
    )
  }
} 