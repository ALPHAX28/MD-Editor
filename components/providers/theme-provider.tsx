"use client"

import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined)

export function ThemeProvider({
  children,
  defaultTheme = "dark",
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme)

  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem("theme") as Theme
      if (storedTheme) {
        setTheme(storedTheme)
      }
    } catch (error) {
      console.warn("Failed to read theme from localStorage:", error)
      setTheme(defaultTheme)
    }
  }, [defaultTheme])

  useEffect(() => {
    try {
      localStorage.setItem("theme", theme)

      const root = window.document.documentElement
      root.classList.remove("light", "dark")

      if (theme === "system") {
        const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
          .matches
          ? "dark"
          : "light"
        root.classList.add(systemTheme)
      } else {
        root.classList.add(theme)
      }
    } catch (error) {
      console.warn("Failed to save theme:", error)
    }
  }, [theme])

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      try {
        setTheme(theme)
      } catch (error) {
        console.warn("Failed to set theme:", error)
      }
    },
  }

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }

  return context
} 