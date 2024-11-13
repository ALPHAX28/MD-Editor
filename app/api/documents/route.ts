import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import clientPromise from '@/lib/mongodb'

export async function GET() {
  try {
    const { userId } = auth()
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const client = await clientPromise
    const db = client.db("markdownEditor")
    const collection = db.collection("documents")

    const documents = await collection.find({ userId }).toArray()
    return NextResponse.json(documents)
  } catch (error) {
    console.error('Error fetching documents:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = auth()
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const body = await req.json()
    const { title, content } = body

    const client = await clientPromise
    const db = client.db("markdownEditor")
    const collection = db.collection("documents")

    const document = {
      title,
      content: content || '',
      userId,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const result = await collection.insertOne(document)
    const newDocument = await collection.findOne({ _id: result.insertedId })

    return NextResponse.json(newDocument)
  } catch (error) {
    console.error('Error creating document:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 