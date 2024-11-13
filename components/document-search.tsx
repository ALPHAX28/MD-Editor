"use client"

import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { useEffect, useRef, useState } from "react"

interface DocumentSearchProps {
  value: string
  onChange: (value: string) => void
}

export function DocumentSearch({ value, onChange }: DocumentSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isFocused, setIsFocused] = useState(false)

  const handleInputClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    inputRef.current?.focus()
  }

  const handleInputFocus = (e: React.FocusEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsFocused(true)
  }

  const handleInputBlur = (e: React.FocusEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsFocused(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    e.stopPropagation()
    onChange(e.target.value)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation()
  }

  return (
    <div 
      className="relative" 
      onClick={handleInputClick}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        placeholder="Search documents..."
        value={value}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        onKeyDown={handleKeyDown}
        className={`w-full h-10 pl-8 pr-4 rounded-md border border-input bg-background text-sm ring-offset-background 
          file:border-0 file:bg-transparent file:text-sm file:font-medium 
          placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 
          focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50
          ${isFocused ? 'ring-2 ring-ring ring-offset-2' : ''}`}
      />
    </div>
  )
} 