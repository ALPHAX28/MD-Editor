import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { prisma } from '@/lib/prisma'
import { supabase } from '@/lib/supabase'

export async function POST(
  req: Request,
  { params }: { params: { documentId: string } }
) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { targetUserId } = await req.json()

    // Verify document ownership
    const document = await prisma.document.findUnique({
      where: {
        id: params.documentId,
        userId: userId // Only document owner can revoke access
      },
      include: {
        sharedWith: true
      }
    })

    if (!document) {
      return NextResponse.json({ error: "Document not found or unauthorized" }, { status: 404 })
    }

    // Update both the document and shared access to VIEW mode
    await prisma.$transaction([
      // Update the shared access record
      prisma.sharedDocument.update({
        where: {
          documentId_userId: {
            documentId: params.documentId,
            userId: targetUserId
          }
        },
        data: {
          accessMode: 'VIEW'
        }
      }),
      // Update the document's share mode
      prisma.document.update({
        where: {
          id: params.documentId
        },
        data: {
          shareMode: 'VIEW'
        }
      })
    ])

    // Get user info for the notification
    const targetShare = document.sharedWith.find(share => share.userId === targetUserId)
    
    // Notify the user through realtime
    await supabase.channel(`document:${params.documentId}`).send({
      type: 'broadcast',
      event: 'access_revoked',
      payload: {
        documentId: params.documentId,
        targetUserId,
        userName: targetShare?.userId || 'User',
        forceReload: true
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[REVOKE_ACCESS_ERROR]', error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
} 