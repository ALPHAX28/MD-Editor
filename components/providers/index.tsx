'use client'

import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/toaster'
import { PortalProvider } from './portal-provider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      storageKey="md-editor-theme"
    >
      <PortalProvider>
        {children}
      </PortalProvider>
      <Toaster />
    </ThemeProvider>
  )
} 