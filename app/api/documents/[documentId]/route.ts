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

    return NextResponse.json(document)
  } catch (error) {
    console.error("[DOCUMENT_GET]", error)
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

    // First check if document exists and belongs to user
    const existingDoc = await prisma.document.findUnique({
      where: {
        id: params.documentId,
      }
    })

    if (!existingDoc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    if (existingDoc.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { title, content } = await req.json()
    console.log("Updating document:", { documentId: params.documentId, title, content }) // Debug log

    const document = await prisma.document.update({
      where: {
        id: params.documentId,
      },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        updatedAt: new Date(),
      }
    })

    console.log("Updated document:", document) // Debug log
    return NextResponse.json(document)
  } catch (error) {
    console.error("[DOCUMENT_PATCH] Full error:", error)
    return NextResponse.json({ 
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
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