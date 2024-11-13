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
    
    return new NextResponse(JSON.stringify({
      ...createdDoc,
      id: createdDoc._id.toString()
    }), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
      },
    })

  } catch (error) {
    console.error('Full error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
    })

    return new NextResponse(
      JSON.stringify({
        error: 'Failed to create document',
        details: error.message,
        type: error.name,
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