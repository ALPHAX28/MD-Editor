import { prisma } from '@/lib/db'
import { auth } from '@clerk/nextjs'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { userId } = auth()
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { content } = await req.json()

    const document = await prisma.document.upsert({
      where: {
        userId_isAutosave: {
          userId,
          isAutosave: true,
        },
      },
      update: {
        content,
        updatedAt: new Date(),
      },
      create: {
        content,
        userId,
        isAutosave: true,
      },
    })

    return NextResponse.json(document)
  } catch (error) {
    console.error('Error saving document:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 