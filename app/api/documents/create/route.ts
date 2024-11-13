import clientPromise from '@/lib/mongodb'
import { auth } from '@clerk/nextjs'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { userId } = auth()
    console.log("Creating document for userId:", userId)

    if (!userId) {
      console.log("No userId found")
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const client = await clientPromise
    const db = client.db("markdown-editor")
    const collection = db.collection("documents")

    const document = await collection.insertOne({
      title: 'Untitled Document',
      content: '',
      userId: userId,
      isAutosave: false,
      isPublic: false,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date()
    })

    const createdDoc = await collection.findOne({ _id: document.insertedId })
    
    console.log("Document created:", createdDoc)
    
    if (!createdDoc) {
      return new NextResponse('Failed to create document', { status: 500 });
    }

    return new NextResponse(JSON.stringify({
      ...createdDoc,
      id: createdDoc._id.toString()
    }), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
      },
    })

  } catch (error: unknown) {
    const err = error as Error
    console.error('Full error details:', {
      name: err.name,
      message: err.message,
      stack: err.stack,
    })

    return new NextResponse(
      JSON.stringify({
        error: 'Failed to create document',
        details: err.message,
        type: err.name,
      }), 
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
  }
} 