'use client'

import { createContext, useContext, useEffect, useState } from 'react'

const PortalContext = createContext<boolean>(false)

export function PortalProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <PortalContext.Provider value={mounted}>
      {children}
    </PortalContext.Provider>
  )
}

export function usePortal() {
  return useContext(PortalContext)
} 