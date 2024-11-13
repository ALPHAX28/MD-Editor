import { prisma } from '@/lib/db'
import { auth } from '@clerk/nextjs'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  try {
    const { userId } = auth()
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const document = await prisma.document.findUnique({
      where: {
        userId_isAutosave: {
          userId,
          isAutosave: true,
        },
      },
    })

    return NextResponse.json(document)
  } catch (error) {
    console.error('Error fetching document:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 