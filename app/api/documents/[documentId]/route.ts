import clientPromise from '@/lib/mongodb'
import { auth } from '@clerk/nextjs'
import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'

// DELETE route for deleting a document
export async function DELETE(
  req: Request,
  { params }: { params: { documentId: string } }
) {
  try {
    const { userId } = auth()
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const client = await clientPromise
    const db = client.db("markdown-editor")
    const collection = db.collection("documents")

    // Ensure valid ObjectId
    let documentObjectId;
    try {
      documentObjectId = new ObjectId(params.documentId);
    } catch (error) {
      return new NextResponse('Invalid document ID', { status: 400 })
    }

    const result = await collection.deleteOne({
      _id: documentObjectId,
      userId
    })

    if (result.deletedCount === 0) {
      return new NextResponse('Document not found', { status: 404 })
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting document:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

// PATCH route for renaming a document
export async function PATCH(
  req: Request,
  { params }: { params: { documentId: string } }
) {
  try {
    const { userId } = auth()
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Ensure valid ObjectId
    let documentObjectId;
    try {
      documentObjectId = new ObjectId(params.documentId);
    } catch (error) {
      return new NextResponse('Invalid document ID', { status: 400 })
    }

    const { title, content } = await req.json()
    const updateData: any = {}
    
    if (title !== undefined) updateData.title = title
    if (content !== undefined) updateData.content = content
    updateData.updatedAt = new Date()

    const client = await clientPromise
    const db = client.db("markdown-editor")
    const collection = db.collection("documents")

    const result = await collection.findOneAndUpdate(
      {
        _id: documentObjectId,
        userId
      },
      {
        $set: updateData
      },
      { 
        returnDocument: 'after'
      }
    )

    if (!result) {
      return new NextResponse('Document not found', { status: 404 })
    }

    // Format the response
    const updatedDoc = {
      ...result,
      id: result._id.toString(),
      _id: undefined
    }

    return NextResponse.json(updatedDoc)
  } catch (error) {
    console.error('Error updating document:', error)
    return new NextResponse(
      JSON.stringify({ 
        error: 'Failed to update document',
        details: error instanceof Error ? error.message : String(error)
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

// GET route for fetching a single document
export async function GET(
  req: Request,
  { params }: { params: { documentId: string } }
) {
  try {
    const { userId } = auth()
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Ensure valid ObjectId
    let documentObjectId;
    try {
      documentObjectId = new ObjectId(params.documentId);
    } catch (error) {
      return new NextResponse('Invalid document ID', { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("markdown-editor")
    const collection = db.collection("documents")

    const document = await collection.findOne({
      _id: documentObjectId,
      userId
    })

    if (!document) {
      return new NextResponse('Document not found', { status: 404 })
    }

    return NextResponse.json({
      ...document,
      id: document._id.toString()
    })
  } catch (error) {
    console.error('Error fetching document:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 