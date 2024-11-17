import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { MarkdownEditor } from '@/components/markdown-editor'
import { currentUser } from "@clerk/nextjs"
import { SignIn } from "@clerk/nextjs"
import { dark } from "@clerk/themes"
import { BaseTheme } from '@clerk/types'

export default async function SharedDocumentPage({ 
  params 
}: { 
  params: { shareToken: string } 
}) {
  const user = await currentUser()
  
  const document = await prisma.document.findUnique({
    where: { shareToken: params.shareToken },
    include: {
      sharedWith: true  // Include shared users
    }
  })

  if (!document) {
    redirect('/404')
  }

  // Get user's specific access mode from SharedUser table
  let userAccessMode = document.shareMode
  if (user) {
    const sharedUser = document.sharedWith.find(su => su.userId === user.id)
    if (sharedUser) {
      userAccessMode = sharedUser.mode
    }
  }

  // For edit mode, require authentication
  if (userAccessMode === 'EDIT' && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-[400px] mx-4 p-6 rounded-lg border bg-card shadow-sm">
          <div className="space-y-2 text-center mb-4">
            <h1 className="text-2xl font-bold tracking-tight">
              Authentication Required
            </h1>
            <p className="text-sm text-muted-foreground">
              Sign in to edit this document
            </p>
          </div>
          <SignIn 
            afterSignInUrl={`/shared/${params.shareToken}`}
            appearance={{
              baseTheme: dark as BaseTheme,
              elements: {
                rootBox: {
                  width: "100%",
                },
                card: {
                  border: "none",
                  boxShadow: "none",
                  width: "100%",
                  background: "transparent",
                },
                headerTitle: { display: "none" },
                headerSubtitle: { display: "none" },
                dividerLine: {
                  background: "hsl(var(--border))",
                  margin: "12px 0",
                },
                dividerText: {
                  color: "hsl(var(--muted-foreground))",
                },
                socialButtons: {
                  marginBottom: "12px",
                  gap: "8px",
                },
                socialButtonsBlockButton: {
                  border: "1px solid hsl(var(--border))",
                  background: "transparent",
                  color: "hsl(var(--foreground))",
                  width: "100%",
                  height: "40px",
                  borderRadius: "var(--radius)",
                  marginBottom: "0",
                  "&:hover": {
                    backgroundColor: "hsl(var(--accent))",
                  },
                },
                socialButtonsBlockButtonText: {
                  flex: 1,
                  textAlign: "center",
                  fontSize: "14px",
                },
                main: {
                  gap: "12px",
                },
                form: {
                  gap: "12px",
                },
                formFieldInput: {
                  background: "transparent",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                  color: "hsl(var(--foreground))",
                  width: "100%",
                  height: "40px",
                  fontSize: "14px",
                },
                formFieldLabel: {
                  color: "hsl(var(--foreground))",
                  fontSize: "14px",
                  marginBottom: "4px",
                },
                formButtonPrimary: {
                  backgroundColor: "hsl(var(--primary))",
                  color: "hsl(var(--primary-foreground))",
                  width: "100%",
                  height: "40px",
                  marginTop: "4px",
                  "&:hover": {
                    opacity: "0.9",
                  },
                },
                footerActionLink: {
                  color: "hsl(var(--primary))",
                },
                footer: {
                  marginTop: "12px",
                },
              },
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <MarkdownEditor 
      documentId={document.id}
      isShared={true}
      shareMode={userAccessMode.toLowerCase()}
      initialContent={document.content}
      title={document.title}
    />
  )
} 