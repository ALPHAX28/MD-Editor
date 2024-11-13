import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    const result = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'documents'
      );
    `
    console.log('Table exists check:', result)
  } catch (error) {
    console.error('Error checking table:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main() 