"use client"

import { SignIn } from "@clerk/nextjs"
import { dark } from "@clerk/themes"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

interface AuthDialogProps {
  mode: "sign-in" | "sign-up"
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  redirectUrl?: string
}

export function AuthDialog({ mode, isOpen, onOpenChange, redirectUrl }: AuthDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] p-0 bg-background">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-center">
            {mode === "sign-in" ? "Welcome Back" : "Create Account"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {mode === "sign-in" 
              ? "Sign in to your account to continue" 
              : "Create an account to get started"
            }
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 pb-6">
          <SignIn 
            appearance={{
              baseTheme: dark,
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
              }
            }}
            redirectUrl={redirectUrl}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
} 