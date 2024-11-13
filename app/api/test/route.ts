import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Test database connection and table existence
    const tableCheck = await prisma.document.findFirst()
    return NextResponse.json({ 
      status: "Database connection successful",
      tableExists: true
    })
  } catch (error) {
    console.error("Database connection error:", error)
    return NextResponse.json(
      { 
        error: "Database connection failed",
        details: error instanceof Error ? error.message : "Unknown error"
      }, 
      { status: 500 }
    )
  }
} 