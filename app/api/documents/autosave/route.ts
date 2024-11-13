import { auth } from '@clerk/nextjs'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const autosaveDoc = await prisma.document.findFirst({
      where: {
        userId,
        isAutosave: true,
      },
    })

    return NextResponse.json(autosaveDoc || { content: '' })
  } catch (error) {
    console.error("[AUTOSAVE_GET]", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { content } = await req.json()

    // First find existing autosave document
    const existingDoc = await prisma.document.findFirst({
      where: {
        userId,
        isAutosave: true,
      },
    })

    let autosaveDoc;
    
    if (existingDoc) {
      // Update existing document
      autosaveDoc = await prisma.document.update({
        where: {
          id: existingDoc.id,
        },
        data: {
          content,
          updatedAt: new Date(),
        },
      })
    } else {
      // Create new document
      autosaveDoc = await prisma.document.create({
        data: {
          userId,
          content,
          isAutosave: true,
          title: 'Autosave Document',
        },
      })
    }

    return NextResponse.json(autosaveDoc)
  } catch (error) {
    console.error("[AUTOSAVE_POST]", error)
    return NextResponse.json({ 
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
} 