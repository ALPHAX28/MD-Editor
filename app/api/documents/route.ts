import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/supabase`)
    const data = await response.json()

    return NextResponse.json(data)
  } catch (error) {
    console.error('API route error:', error)
    return new NextResponse('Internal Error', { status: 500 })
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