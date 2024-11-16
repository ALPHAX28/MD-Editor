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
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { mode } = await req.json()
    
    const document = await prisma.document.findUnique({
      where: { 
        id: params.documentId,
        userId 
      }
    })

    if (!document) {
      return new NextResponse("Not found", { status: 404 })
    }

    const shareToken = nanoid()
    
    const updatedDoc = await prisma.document.update({
      where: { id: params.documentId },
      data: {
        shareMode: mode === 'edit' ? 'EDIT' : 'VIEW',
        shareToken
      }
    })

    return NextResponse.json({ shareToken: updatedDoc.shareToken })
  } catch (error) {
    console.error('[SHARE_ERROR]', error)
    return new NextResponse("Internal Error", { status: 500 })
  }
} 