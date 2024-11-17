import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
      return new NextResponse('Database Error', { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('API route error:', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { title, content } = await req.json()

    const { data, error } = await supabase
      .from('documents')
      .insert([
        {
          title,
          content: content || '',
          user_id: userId,
          is_autosave: false,
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: "Database Error" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("[DOCUMENTS_POST]", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
} 