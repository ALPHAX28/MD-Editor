import { auth } from '@clerk/nextjs'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    console.log("Request body:", body)

    const document = await prisma.document.create({
      data: {
        title: body.title || 'Untitled',
        content: body.content || '',
        userId,
        isAutosave: false,
      }
    })

    console.log("Created document:", document)
    return NextResponse.json(document)
  } catch (error) {
    console.error("Full error object:", error)
    console.error("Error creating document:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    })

    return NextResponse.json(
      { 
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error"
      }, 
      { status: 500 }
    )
  }
} 