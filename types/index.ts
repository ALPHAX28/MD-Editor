export interface Document {
  id: string
  title: string
  content: string
  createdAt: Date
  updatedAt: Date
  userId: string
  isPublic: boolean
  isAutosave: boolean
  isArchived: boolean
} 