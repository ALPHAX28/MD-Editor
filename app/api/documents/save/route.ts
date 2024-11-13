import { supabase } from '@/lib/supabase'
import { auth } from '@clerk/nextjs'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { userId } = auth()
    console.log("Saving for userId:", userId)

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { content } = await req.json()
    console.log("Content received:", content ? "Yes" : "No")

    // Find or create autosave document in Supabase
    const { data: existingDoc, error: fetchError } = await supabase
      .from('autosave_documents')
      .select()
      .eq('user_id', userId)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "not found" error
      throw fetchError
    }

    let result;
    if (existingDoc) {
      // Update existing document
      const { data, error } = await supabase
        .from('autosave_documents')
        .update({
          content,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error
      result = data
    } else {
      // Create new document
      const { data, error } = await supabase
        .from('autosave_documents')
        .insert({
          user_id: userId,
          content,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      result = data
    }

    console.log("Document saved:", result)
    return NextResponse.json(result)

  } catch (error: unknown) {
    const err = error as Error
    console.error('Full error details:', {
      name: err.name,
      message: err.message,
      stack: err.stack,
    })

    return new NextResponse(
      JSON.stringify({
        error: 'Failed to save document',
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