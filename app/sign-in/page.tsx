'use client'

import { AuthDialog } from "@/components/auth/auth-dialog"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

export default function SignInPage() {
  const [isOpen, setIsOpen] = useState(true)
  const searchParams = useSearchParams()
  const router = useRouter()
  const redirectUrl = searchParams.get('redirect_url') || '/'

  // Automatically open the dialog when the page loads
  useEffect(() => {
    setIsOpen(true)
  }, [])

  // Handle dialog close - redirect back if there's a redirect URL
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      router.push(redirectUrl)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <AuthDialog 
        mode="sign-in"
        isOpen={isOpen}
        onOpenChange={handleOpenChange}
        redirectUrl={redirectUrl}
      />
    </div>
  )
} 