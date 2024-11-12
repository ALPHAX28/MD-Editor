'use client'

import { Button } from "@/components/ui/button"
import { useAuth, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs"
import { ArrowRight, Check, FileDown, Github, Moon, Sun } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { ThemeToggle } from "@/components/theme-toggle"

export default function LandingPage() {
  const { isLoaded, isSignedIn } = useAuth()

  const features = [
    "GitHub-flavored markdown support",
    "Real-time preview",
    "Export to PDF, Word, and HTML",
    "Dark mode support",
    "Syntax highlighting",
    "Table support",
    "Task lists",
    "Auto-save (coming soon)",
    "Collaborative editing (coming soon)"
  ]

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <FileDown className="h-6 w-6 mr-2" />
              <span className="text-xl font-bold">MD Editor</span>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              {isLoaded && (
                <>
                  {!isSignedIn ? (
                    <>
                      <SignInButton mode="modal">
                        <Button variant="ghost" size="sm">
                          Sign in
                        </Button>
                      </SignInButton>
                      <SignUpButton mode="modal">
                        <Button variant="default" size="sm">
                          Sign up
                        </Button>
                      </SignUpButton>
                    </>
                  ) : (
                    <UserButton afterSignOutUrl="/" />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-grow">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          {/* Hero section */}
          <div className="text-center mb-16">
            <motion.h1 
              className="text-4xl sm:text-6xl font-bold mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              The Modern Markdown Editor
            </motion.h1>
            <motion.p 
              className="text-xl text-muted-foreground mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Write, preview, and export your markdown documents with ease.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Link href="/editor">
                <Button size="lg" className="group">
                  Go to Editor
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </motion.div>
          </div>

          {/* Features grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {features.map((feature, index) => (
              <motion.div
                key={feature}
                className="p-6 rounded-lg border bg-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>{feature}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <Link href="https://github.com" target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="sm">
                  <Github className="h-4 w-4 mr-2" />
                  GitHub
                </Button>
              </Link>
            </div>
            <div className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} MD Editor. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}