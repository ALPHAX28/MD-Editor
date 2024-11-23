"use client"

export function Sidebar() {
  return (
    <div className="relative h-full">
      <div className="fixed inset-y-0 left-0 w-64 bg-muted border-r">
        <div className="absolute inset-0 bg-muted rounded-tr-2xl rounded-br-2xl">
          <aside className="h-full p-4">
            {/* ... rest of the sidebar content */}
          </aside>
        </div>
      </div>
      <div className="w-64" aria-hidden="true"></div>
    </div>
  )
} 