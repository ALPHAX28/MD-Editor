import clientPromise from '@/lib/mongodb'
import { auth } from '@clerk/nextjs'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const { userId } = auth()
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const client = await clientPromise
    const db = client.db("markdown-editor")
    const collection = db.collection("documents")

    const documents = await collection
      .find({
        userId,
        isAutosave: false,
        isArchived: false,
      })
      .sort({ updatedAt: -1 })
      .toArray()

    const formattedDocs = documents.map(doc => ({
      ...doc,
      id: doc._id.toString(),
      _id: undefined
    }))

    return NextResponse.json(formattedDocs)
  } catch (error) {
    console.error('Error fetching documents:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 