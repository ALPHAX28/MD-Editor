/*
  Warnings:

  - A unique constraint covering the columns `[shareToken]` on the table `documents` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ShareMode" AS ENUM ('PRIVATE', 'VIEW', 'EDIT');

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "shareMode" "ShareMode" NOT NULL DEFAULT 'PRIVATE',
ADD COLUMN     "shareToken" TEXT;

-- CreateTable
CREATE TABLE "shared_users" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "mode" "ShareMode" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shared_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shared_users_userId_documentId_key" ON "shared_users"("userId", "documentId");

-- CreateIndex
CREATE UNIQUE INDEX "documents_shareToken_key" ON "documents"("shareToken");

-- AddForeignKey
ALTER TABLE "shared_users" ADD CONSTRAINT "shared_users_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
