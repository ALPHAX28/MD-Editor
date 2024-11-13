import { auth } from '@clerk/nextjs'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const documents = await prisma.document.findMany({
      where: {
        userId,
        isAutosave: false,
        isArchived: false,
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    return NextResponse.json(documents)
  } catch (error) {
    console.error("[DOCUMENTS_GET]", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { title, content } = await req.json()

    const document = await prisma.document.create({
      data: {
        title,
        content: content || '',
        userId,
        isAutosave: false,
      }
    })

    return NextResponse.json(document)
  } catch (error) {
    console.error("[DOCUMENTS_POST]", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
} 