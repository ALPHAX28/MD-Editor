import { auth } from '@clerk/nextjs'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const { userId } = auth()

  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const document = await prisma.document.findFirst({
      where: {
        userId,
        isAutosave: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    return NextResponse.json(document)
  } catch (error) {
    console.error('GET /api/documents/autosave', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

export async function POST(req: Request) {
  const { userId } = auth()

  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
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
        userId,
        content,
        isAutosave: true,
        title: 'Autosave',
      },
    })

    return NextResponse.json(document)
  } catch (error) {
    console.error('POST /api/documents/autosave', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
} 