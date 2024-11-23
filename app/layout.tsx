import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "@/styles/markdown.css";
import { ClerkProvider } from '@clerk/nextjs'
import { Toaster } from "@/components/ui/toaster"
import '@/styles/katex.css'
import { ThemeProvider } from "@/components/providers/theme-provider";
import { dark } from "@clerk/themes";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider 
      appearance={{
        baseTheme: dark,
      }}
    >
      <html lang="en" suppressHydrationWarning>
        <body className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
          <ThemeProvider defaultTheme="dark">
            <div id="root">
              {children}
            </div>
            <div id="portal-root" />
            <div id="modal-root" />
            <div id="dialog-root" />
            <div id="dropdown-root" />
            <div id="tooltip-root" />
            <div id="popover-root" />
            <Toaster />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
