import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({ status: 'Database connection successful' })
  } catch (error) {
    console.error('Database connection error:', error)
    return NextResponse.json({ 
      status: 'Database connection failed', 
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
} 