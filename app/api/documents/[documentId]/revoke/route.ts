import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs'
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(
  req: Request,
  { params }: { params: { documentId: string } }
) {
  try {
    const { userId } = auth()
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { userId: targetUserId } = await req.json()

    // First check if the document belongs to the user
    const document = await prisma.document.findUnique({
      where: { id: params.documentId },
      include: {
        sharedWith: true
      }
    })

    if (!document) {
      return new NextResponse('Document not found', { status: 404 })
    }

    if (document.userId !== userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Update the shared user's access mode to VIEW
    await prisma.sharedUser.updateMany({
      where: {
        documentId: params.documentId,
        userId: targetUserId
      },
      data: { 
        mode: 'VIEW'
      }
    })

    // Update document's share mode for this user
    await prisma.document.update({
      where: { id: params.documentId },
      data: {
        shareMode: 'VIEW'
      }
    })

    // Broadcast access revocation
    const channel = supabase.channel(`document:${params.documentId}`)
    await channel.send({
      type: 'broadcast',
      event: 'access_revoked',
      payload: {
        documentId: params.documentId,
        targetUserId,
        mode: 'VIEW',
        userName: document.sharedWith.find(u => u.userId === targetUserId)?.userId || 'User',
        forceReload: true
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error revoking access:', error)
    return new NextResponse('Internal error', { status: 500 })
  }
} 