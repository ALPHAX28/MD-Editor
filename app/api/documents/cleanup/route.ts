import { auth } from '@clerk/nextjs'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Delete all autosave documents for this user
    await prisma.document.deleteMany({
      where: {
        userId,
        isAutosave: true,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[CLEANUP]", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
} 