export default function SharedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div id="shared-layout-root" className="relative">
      {children}
      <div id="portal-mount-point" />
      <div id="dialog-mount-point" />
      <div id="dropdown-mount-point" />
    </div>
  )
} 