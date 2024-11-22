'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Bold, 
  Italic, 
  Underline, 
  List, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  Table, 
  FileDown, 
  Code, 
  Quote, 
  Heading1, 
  Heading2, 
  Heading3, 
  Square, 
  Strikethrough, 
  Moon, 
  Sun, 
  Loader, 
  Copy, 
  Check, 
  Menu, 
  Share 
} from 'lucide-react'
import { saveAs } from 'file-saver'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { motion, AnimatePresence } from 'framer-motion'
import { usePDF } from 'react-to-pdf'
import rehypeRaw from 'rehype-raw'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useAuth, SignIn, SignUp, UserButton, SignInButton, SignUpButton, useUser } from "@clerk/nextjs";
import { useToast } from "@/hooks/use-toast"
import { useTheme } from "next-themes"
import { dark, neobrutalism, shadesOfPurple } from "@clerk/themes";
import NextLink from 'next/link'
import { useAutosave } from '@/hooks/use-autosave'
import { SaveStatusIndicator } from "@/components/save-status"
import { DocumentSidebar } from "@/components/document-sidebar"
import { Document } from "@/types"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import katex from 'katex'
import { Components } from 'react-markdown'
import { ShareDialog } from "@/components/share-dialog"
import { cn } from "@/lib/utils"
import { useLocalStorage } from '@/hooks/use-local-storage'
import { AuthDialog } from "@/components/auth/auth-dialog"
import { useRealtime } from '@/hooks/use-realtime'
import { CursorPresence } from '@/components/cursor-presence'
import { UsersOnline } from '@/components/users-online'
import { ActiveUsers } from '@/components/active-users'
import { Cursor } from '@/hooks/use-realtime'
import { supabase } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'


interface CodeProps {
  node?: unknown;
  inline?: boolean;
  className?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

type MathProps = {
  value: string;
}

type ClerkAppearance = {
  baseTheme?: 'dark' | 'light';
  elements?: {
    card?: string;
    rootBox?: string;
    formButtonPrimary?: string;
    [key: string]: any;
  };
};

interface MarkdownEditorProps {
  documentId?: string
  isShared?: boolean
  shareMode?: string
  initialContent?: string
  title?: string | null
}

export function MarkdownEditor({ 
  documentId,
  isShared = false,
  shareMode = 'private',
  initialContent = '',
  title
}: MarkdownEditorProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  const [tab, setTab] = useState('write')
  const [isPdfExporting, setIsPdfExporting] = useState(false)
  const [isWordExporting, setIsWordExporting] = useState(false)
  const [isHtmlExporting, setIsHtmlExporting] = useState(false)
  const { toPDF, targetRef } = usePDF({filename: 'markdown-document.pdf'})
  const [showDialog, setShowDialog] = useState(false)
  const [dialogMessage, setDialogMessage] = useState('')
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { user } = useUser();
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up">("sign-in")
  const { toast } = useToast()
  const { theme, setTheme } = useTheme()
  const [documents, setDocuments] = useState<Document[]>([])
  const [activeDocumentId, setActiveDocumentId] = useState<string>()
  
  const { 
    content, 
    setContent, 
    lastSaved, 
    saveStatus, 
    setLastSaved, 
    setSaveStatus
  } = useAutosave(documentId, initialContent, isShared, shareMode)

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [localTheme, setLocalTheme] = useLocalStorage('md-editor-theme', 'dark')
  const [isUnauthorized, setIsUnauthorized] = useState(false)
  const [redirectPath, setRedirectPath] = useState<string>('')

  useEffect(() => {
    if (isShared) {
      router.push(pathname);
    }
  }, [isShared, pathname, router]);

  const { 
    cursors, 
    content: realtimeContent, 
    updateCursor, 
    updateContent, 
    isChannelReady,
    presenceState,
    isAccessRevoked,
    currentAccessMode,
    clearPresence,
    removeCursor,
  } = useRealtime(
    (isShared || documentId === activeDocumentId) ? documentId || '' : activeDocumentId || '',
    (isShared || documentId === activeDocumentId) ? shareMode : 'none',
    isSignedIn && !isShared && !!user
  )

  useEffect(() => {
    console.log('Editor mounted with:', {
      documentId,
      pathId: window?.location?.pathname?.split('/shared/').pop(),
      isShared,
      shareMode,
      user: user?.id
    })
  }, [documentId, isShared, shareMode, user])

  useEffect(() => {
    if (localTheme === 'dark') {
      document.documentElement.classList.add('dark')
      setTheme('dark')
    } else {
      document.documentElement.classList.remove('dark')
      setTheme('light')
    }
  }, [localTheme, setTheme])

  useEffect(() => {
    if (isSignedIn) {
      fetchDocuments()
    }
  }, [isSignedIn])

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/documents')
      if (!response.ok) throw new Error('Failed to fetch documents')
      const data = await response.json()
      setDocuments(data)
    } catch (error) {
      console.error('Error fetching documents:', error)
    }
  }

  const insertAtCursor = (before: string, after = '') => {
    const textarea = document.querySelector('textarea')
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = textarea.value
    const selectedText = text.substring(start, end)
    
    const newText = 
      text.substring(0, start) + 
      before + 
      (selectedText || (before === '\n---\n' ? '' : 'text')) + 
      after + 
      text.substring(end)
    
    setContent(newText)
    
    if (isChannelReady) {
      updateContent(newText)
    }
    
    setTimeout(() => {
      textarea.focus()
      const newPosition = start + before.length + (selectedText || (before === '\n---\n' ? '' : 'text')).length + after.length
      textarea.setSelectionRange(newPosition, newPosition)
    }, 0)
  }

  const handlePdfExport = async () => {
    const isDarkMode = document.documentElement.classList.contains('dark')
    
    try {
      if (isDarkMode) {
        document.documentElement.classList.remove('dark')
      }
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      await toPDF()
      
      if (isDarkMode) {
        document.documentElement.classList.add('dark')
      }
    } catch (error) {
      if (isDarkMode) {
        document.documentElement.classList.add('dark')
      }
      throw error
    }
  }

  const handleExport = async (type: 'PDF' | 'Word' | 'HTML') => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      setShowAuthDialog(true);
      return;
    }

    if (tab !== 'preview') {
      setDialogMessage(`Please switch to the Preview tab before exporting to ${type}.`)
      setShowDialog(true)
      return
    }

    try {
      switch (type) {
        case 'PDF':
          setIsPdfExporting(true)
          await handlePdfExport()
          break
        case 'Word':
          setIsWordExporting(true)
          await exportToWord()
          break
        case 'HTML':
          setIsHtmlExporting(true)
          await exportToHtml()
          break
      }
    } catch (error) {
      console.error(`Error exporting ${type}:`, error)
    } finally {
      setIsPdfExporting(false)
      setIsWordExporting(false)
      setIsHtmlExporting(false)
    }
  }

  const exportToPDF = async () => {
    try {
      await toPDF()
      console.log("PDF exported successfully")
    } catch (error) {
      throw error
    }
  }

  const exportToWord = async () => {
    try {
      const previewContent = document.querySelector('.prose')?.innerHTML
      if (!previewContent) {
        throw new Error('Preview content not found')
      }

      // Create a Blob with the correct MIME type for Word
      const mhtml = `MIME-Version: 1.0
Content-Type: multipart/related; boundary="boundary-example"

--boundary-example
Content-Type: text/html; charset="utf-8"
Content-Transfer-Encoding: quoted-printable

<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: Calibri, Arial, sans-serif; }
  h1 { font-size: 24pt; border-bottom: 1pt solid #eee; padding-bottom: 6pt; }
  h2 { font-size: 18pt; border-bottom: 1pt solid #eee; padding-bottom: 6pt; }
  h3 { font-size: 14pt; }
  pre { background-color: #f6f8fa; padding: 12pt; margin: 12pt 0; }
  code { font-family: 'Courier New', monospace; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1pt solid #ddd; padding: 8pt; }
  th { background-color: #f6f8fa; }
  blockquote { border-left: 4pt solid #ddd; margin: 0; padding: 0 12pt; }
</style>
</head>
<body>
${previewContent}
</body>
</html>

--boundary-example--`

      const blob = new Blob([mhtml], {
        type: 'application/vnd.ms-word;charset=utf-8'
      })
      
      await saveAs(blob, 'markdown-document.doc')

      console.log("Word document exported successfully")
    } catch (error) {
      throw error
    }
  }

  const exportToHtml = async () => {
    try {
      const previewContent = document.querySelector('.prose')?.innerHTML
      if (!previewContent) {
        throw new Error('Preview content not found')
      }

      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Markdown Export</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      line-height: 1.5;
      max-width: 800px;
      margin: 40px auto;
      padding: 0 20px;
    }
    h1 { font-size: 2em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
    h2 { font-size: 1.5em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
    h3 { font-size: 1.25em; }
    pre { background-color: #f6f8fa; padding: 16px; border-radius: 6px; overflow: auto; }
    code { background-color: #f6f8fa; padding: 0.2em 0.4em; border-radius: 3px; font-family: monospace; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; }
    th { background-color: #f6f8fa; }
    blockquote { margin: 0; padding-left: 1em; border-left: 0.25em solid #ddd; color: #666; }
  </style>
</head>
<body>
  ${previewContent}
</body>
</html>`

      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' })
      await saveAs(blob, 'markdown-export.html')

      console.log("HTML exported successfully")
    } catch (error) {
      throw error
    }
  }

  const handleSignInSuccess = () => {
    setShowAuthDialog(false);
    
    // If we have a redirect path, use it
    if (redirectPath) {
      window.location.href = redirectPath;
    }
    
    toast({
      title: "Success",
      description: "Successfully signed in!",
      duration: 3000,
    });
  };

  const handleDocumentSelect = async (documentId: string) => {
    try {
      if (activeDocumentId === documentId) return;
      
      // Remove cursor before switching documents
      if (!isShared) {
        removeCursor?.();
      }
      
      // Clear presence only if switching to a non-shared document
      if (!isShared && documentId !== activeDocumentId) {
        clearPresence?.();
      }
      
      // Save current document before switching if there's unsaved content
      if (activeDocumentId && content) {
        await fetch(`/api/documents/${activeDocumentId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ content }),
        });
      }
      
      // Update local state
      setActiveDocumentId(documentId);
      
      // Fetch the selected document
      const response = await fetch(`/api/documents/${documentId}`);
      if (!response.ok) throw new Error('Failed to load document');
      
      const document = await response.json();
      setContent(document.content || '');
      
      // Update URL without triggering a navigation/refresh
      window.history.pushState({}, '', `/editor/${documentId}`);
      
      toast({
        title: "Document loaded",
        description: "Successfully loaded document",
        duration: 3000,
      });
    } catch (error) {
      console.error('Error selecting document:', error);
      toast({
        title: "Error",
        description: "Failed to load document",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const handleNewDocument = async (title: string) => {
    if (!isSignedIn) return;
    
    try {
      // Create new document
      const response = await fetch('/api/documents/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          title: title || 'Untitled Document',
          content: ''
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create document');
      }
      
      const newDoc = await response.json();
      
      // Update documents list with the new document
      setDocuments(prev => [...prev, { ...newDoc, title: title || 'Untitled Document' }]);
      setActiveDocumentId(newDoc.id);
      
      // Initialize content state
      setContent('');
      
      // Update URL without triggering a navigation/refresh
      window.history.pushState({}, '', `/editor/${newDoc.id}`);
      
      toast({
        title: "Success",
        description: `Created "${title || 'Untitled Document'}"!`,
        duration: 3000,
      });
    } catch (error: any) {
      console.error('Full error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create document",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const handleRenameDocument = async (documentId: string, newTitle: string) => {
    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: newTitle }),
      })
      
      if (!response.ok) throw new Error('Failed to rename document')
      
      const updatedDoc = await response.json()
      setDocuments(prev => prev.map(doc => 
        doc.id === documentId ? { ...doc, title: newTitle } : doc
      ))
      
      toast({
        title: "Success",
        description: "Document renamed successfully",
        duration: 3000,
      })
    } catch (error) {
      console.error('Error renaming document:', error)
      toast({
        title: "Error",
        description: "Failed to rename document",
        variant: "destructive",
        duration: 3000,
      })
    }
  }

  const handleDeleteDocument = async (documentId: string) => {
    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) throw new Error('Failed to delete document')
      
      setDocuments(prev => prev.filter(doc => doc.id !== documentId))
      if (activeDocumentId === documentId) {
        setActiveDocumentId(undefined)
        setContent('')
      }
      
      toast({
        title: "Success",
        description: "Document deleted successfully",
        duration: 3000,
      })
    } catch (error) {
      console.error('Error deleting document:', error)
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive",
        duration: 3000,
      })
    }
  }

  const CodeBlock = ({ children, className, ...props }: any) => {
    const [isCopied, setIsCopied] = useState(false)
    const textContent = String(children).replace(/\n$/, '')
    
    const copyToClipboard = async () => {
      try {
        await navigator.clipboard.writeText(textContent)
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
      } catch (err) {
        console.error('Failed to copy text: ', err)
      }
    }

    const match = /language-(\w+)/.exec(className || '')
    const lang = match ? match[1] : ''

    if (props.inline) {
      return <code className={className} {...props}>{children}</code>
    }

    return (
      <div className="group relative">
        <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 bg-background/50 backdrop-blur-sm"
            onClick={copyToClipboard}
          >
            {isCopied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
        <SyntaxHighlighter
          style={tomorrow}
          language={lang || 'text'}
          PreTag="div"
          {...props}
        >
          {textContent}
        </SyntaxHighlighter>
      </div>
    )
  }

  useEffect(() => {
    if (realtimeContent) {
      console.log('Received realtime content:', {
        content: realtimeContent,
        documentId,
        isShared,
        shareMode
      })
      setContent(realtimeContent)
    }
  }, [realtimeContent])

  // Add this helper function to get current document title
  const getCurrentDocumentTitle = () => {
    if (!activeDocumentId) return "Untitled";
    const currentDoc = documents.find(doc => doc.id === activeDocumentId);
    return currentDoc?.title || "Untitled";
  };

  const handleManualSave = async () => {
    if (!content || !isSignedIn || !userId) return
    
    setSaveStatus('saving')
    try {
      const endpoint = documentId 
        ? `/api/documents/${documentId}`
        : '/api/documents/autosave'
      
      const method = documentId ? 'PATCH' : 'POST'
      
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })

      if (!response.ok) {
        throw new Error('Failed to save document')
      }

      const data = await response.json()
      setLastSaved(new Date(data.updatedAt))
      setSaveStatus('saved')
    } catch (error) {
      console.error('Failed to save document:', error)
      setSaveStatus('error')
    }
  }

  const handleShare = async (mode: "view" | "edit") => {
    if (!activeDocumentId) {
      toast({
        title: "Error",
        description: "Please save the document before sharing",
        variant: "destructive",
      })
      throw new Error("No document ID")
    }

    try {
      const response = await fetch(`/api/documents/${activeDocumentId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to share document')
      }
      
      const data = await response.json()
      return `${window.location.origin}/shared/${data.shareToken}`
    } catch (error) {
      console.error('Share error:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to share document",
        variant: "destructive",
      })
      throw error
    }
  }

  const markdownComponents = {
    code: CodeBlock as any,
    h1: ({children, ...props}: any) => (
      <h1 className="text-3xl font-bold border-b border-gray-200 pb-4 mb-4" {...props}>
        {children}
      </h1>
    ),
    h2: ({children, ...props}) => (
      <h2 className="text-2xl font-bold border-b border-gray-200 pb-3 mb-4" {...props}>
        {children}
      </h2>
    ),
    h3: ({children, ...props}) => (
      <h3 className="text-xl font-bold mb-3" {...props}>{children}</h3>
    ),
    ul: ({children, ...props}) => (
      <ul className="list-disc pl-6 mb-4 space-y-2" {...props}>{children}</ul>
    ),
    ol: ({children, ...props}) => (
      <ol className="list-decimal pl-6 mb-4 space-y-2" {...props}>{children}</ol>
    ),
    li: ({children, ...props}) => (
      <li className="mb-1" {...props}>{children}</li>
    ),
    blockquote: ({children, ...props}) => (
      <blockquote className="border-l-4 border-gray-300 pl-4 py-2 my-4 bg-gray-50 dark:bg-gray-800" {...props}>
        {children}
      </blockquote>
    ),
    table: ({children, ...props}) => (
      <div className="overflow-x-auto my-4">
        <table className="min-w-full border-collapse" {...props}>{children}</table>
      </div>
    ),
    th: ({children, ...props}) => (
      <th className="border px-4 py-2 bg-gray-100 dark:bg-gray-700 font-semibold" {...props}>
        {children}
      </th>
    ),
    td: ({children, ...props}) => (
      <td className="border px-4 py-2" {...props}>{children}</td>
    ),
    a: ({children, href, ...props}) => {
      const formattedHref = href?.startsWith('http') 
        ? href 
        : `https://${href}`
      
      return (
        <a 
          href={formattedHref}
          className="text-blue-500 hover:text-blue-600 underline"
          target="_blank"
          rel="noopener noreferrer"
          {...props}
        >
          {children}
        </a>
      )
    },
    img: ({src, alt, ...props}) => (
      <img
        src={src}
        alt={alt}
        className="max-w-full h-auto rounded-lg my-4"
        {...props}
      />
    ),
    hr: (props) => (
      <hr className="my-8 border-t border-gray-300 dark:border-gray-600" {...props} />
    ),
    math: ({value}: {value: any}) => {
      if (!value || typeof value !== 'string') return null;
      try {
        return (
          <div className="my-2">
            <span 
              dangerouslySetInnerHTML={{ 
                __html: katex.renderToString(value.toString(), {
                  throwOnError: false,
                  displayMode: true,
                  strict: false
                })
              }} 
            />
          </div>
        );
      } catch (error) {
        console.error('KaTeX error:', error);
        return <div className="text-red-500">Error rendering math equation</div>;
      }
    },
    inlineMath: ({value}: {value: any}) => {
      if (!value || typeof value !== 'string') return null;
      try {
        return (
          <span 
            dangerouslySetInnerHTML={{ 
              __html: katex.renderToString(value.toString(), {
                throwOnError: false,
                displayMode: false,
                strict: false
              })
            }} 
          />
        );
      } catch (error) {
        console.error('KaTeX error:', error);
        return <span className="text-red-500">Error rendering math equation</span>;
      }
    }
  } as Components;

  const toggleTheme = () => {
    const newTheme = localTheme === 'dark' ? 'light' : 'dark'
    setLocalTheme(newTheme)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    if (isReadOnly) return

    const textarea = e.currentTarget
    const rect = textarea.getBoundingClientRect()
    
    updateCursor({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      isTextCursor: false,
      selection: {
        start: textarea.selectionStart,
        end: textarea.selectionEnd,
        text: '',
        line: 0,
        column: 0
      }
    })
  }

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!isEditingAllowed) {
      if (isShared && shareMode === 'edit' && !isSignedIn) {
        setAuthMode("sign-in")
        setShowAuthDialog(true)
      }
      return
    }

    const newContent = e.target.value
    setContent(newContent)
    
    // Only update content in realtime if we're in the correct document
    if (isChannelReady && ((isShared && documentId) || (!isShared && documentId === activeDocumentId))) {
      updateContent(newContent)
    }
  }

  useEffect(() => {
    console.log('Channel status:', {
      isChannelReady,
      documentId: documentId || activeDocumentId,
      isShared,
      shareMode
    })
  }, [isChannelReady, documentId, activeDocumentId, isShared, shareMode])

  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    if (isReadOnly) return

    const textarea = e.currentTarget
    const selectedText = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd)
    
    updateCursor({
      x: 0,
      y: 0,
      isTextCursor: true,
      selection: {
        start: textarea.selectionStart,
        end: textarea.selectionEnd,
        text: selectedText,
        line: 0,
        column: 0
      }
    })
  }

  // Add this helper function to calculate selection position
  const calculateSelectionPosition = (selection: Cursor['selection']) => {
    const textarea = document.querySelector('textarea')
    if (!textarea) return { top: 0, left: 0, width: 0 }

    const text = textarea.value.substring(0, selection.start)
    const lines = text.split('\n')
    const lineNumber = lines.length - 1
    const charPos = lines[lines.length - 1].length

    return {
      top: lineNumber * 1.5 + 1,
      left: charPos * 0.6,
      width: (selection.end - selection.start) * 0.6
    }
  }

  const isReadOnly = useMemo(() => {
    if (!isShared) return false;
    if (shareMode === 'view' || isAccessRevoked) return true;
    if (shareMode === 'edit' && !isSignedIn) return true;
    return false;
  }, [isShared, shareMode, isSignedIn, isAccessRevoked]);

  useEffect(() => {
    if (isAccessRevoked) {
      // Update any UI states that need to change when access is revoked
      setContent(content); // This will trigger a re-render with the new readonly state
      
      // Update the share mode display
      if (shareMode === 'edit') {
        toast({
          title: "View Only",
          description: "You are now in view-only mode",
          duration: 3000,
        });
      }
    }
  }, [isAccessRevoked]);

  const displayMode = useMemo(() => {
    if (isAccessRevoked || currentAccessMode === 'view') {
      return 'View only';
    }
    return shareMode === 'edit' ? 'Can edit' : 'View only';
  }, [shareMode, isAccessRevoked, currentAccessMode]);

  // Update the getUserButtonProps function
  const getUserButtonProps = (isAccessRevoked: boolean) => ({
    appearance: {
      elements: {
        userPreviewMainIdentifier: {
          fontWeight: "600",
          fontSize: "14px",
        },
        userPreviewSecondaryIdentifier: {
          fontSize: "14px",
        },
        avatarBox: {
          width: "32px",
          height: "32px",
        },
        // Hide manage access button and text completely
        userButtonPopoverActionButton: {
          display: isAccessRevoked ? "none" : "flex",
        },
        userButtonPopoverFooter: {
          display: isAccessRevoked ? "none" : "flex",
        },
        // Remove the edit/view text display
        userButtonTrigger: {
          "&::after": {
            display: "none", // Hide the text
          }
        },
        // Hide the manage access option in dropdown
        userPreviewTextContainer: {
          "& > *:last-child": {
            display: "none",
          }
        },
        // Modify dropdown items
        userButtonPopoverCard: {
          "& [role='menuitem']:last-child": {
            display: isAccessRevoked ? "none" : "flex",
          }
        }
      },
    },
    // Additional props to control the user profile menu
    userProfileProps: {
      appearance: {
        elements: {
          userProfileManageButtonIcon: {
            display: "none",
          },
          userProfileManageButton: {
            display: "none",
          },
          userProfileSectionPrimaryButton: {
            display: isAccessRevoked ? "none" : "flex",
          },
          // Update the mode text in profile
          userProfileData: {
            "&::after": {
              content: isAccessRevoked ? '"View only"' : '"Can edit"',
              display: "block",
              fontSize: "14px",
              color: "var(--text-muted)",
            }
          }
        }
      }
    }
  });

  // Add effect to handle initial URL document loading
  useEffect(() => {
    if (!isSignedIn || !isLoaded) return;

    const loadDocumentFromUrl = async () => {
      const urlParts = pathname.split('/');
      const urlDocId = urlParts[urlParts.length - 1];
      
      if (urlDocId && urlDocId !== 'editor') {
        await handleDocumentSelect(urlDocId);
      }
    };

    loadDocumentFromUrl();
  }, [isSignedIn, isLoaded, pathname]);

  // Update the cleanup effect
  useEffect(() => {
    return () => {
      if (!isShared) {
        removeCursor?.();
        clearPresence?.();
      }
    };
  }, [activeDocumentId, isShared, removeCursor, clearPresence]);

  // Update the isEditingAllowed check
  const isEditingAllowed = useMemo(() => {
    if (isShared) {
      // In shared mode, allow editing if:
      // 1. It's in edit mode
      // 2. User is signed in
      // 3. Not access revoked
      return shareMode === 'edit' && isSignedIn && !isAccessRevoked;
    }
    
    // In owner mode, allow editing if:
    // 1. User is signed in
    // 2. Not access revoked
    return isSignedIn && !isAccessRevoked;
  }, [isShared, shareMode, isSignedIn, isAccessRevoked]);

  // Add an effect to handle document loading and realtime connection
  useEffect(() => {
    if (!isLoaded || !documentId) return;

    // If this is a shared document or we're viewing the shared document
    if (isShared || documentId === activeDocumentId) {
      // Force a cleanup and reconnection
      clearPresence?.();
      
      // Update active document ID to match the shared document
      if (!isShared) {
        setActiveDocumentId(documentId);
      }
    }
  }, [documentId, isLoaded, isShared, activeDocumentId]);

  // Add this effect to handle logout scenarios
  useEffect(() => {
    if (isShared && !isSignedIn) {
      // Clear cursor and presence when user logs out in shared mode
      removeCursor?.();
      clearPresence?.();
    }
  }, [isSignedIn, isShared]);

  // Add this effect to handle redirect path setting
  useEffect(() => {
    if (isShared && !isSignedIn) {
      // Store the current URL for redirect after login
      setRedirectPath(window.location.href);
    }
  }, [isShared, isSignedIn]);

  return (
    <div className="relative h-full">
      {isShared && !isSignedIn && (
        <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center">
          {showAuthDialog ? (
            <AuthDialog 
              mode="sign-in"
              isOpen={showAuthDialog}
              onOpenChange={(open) => {
                setShowAuthDialog(open);
                if (!open) {
                  setIsUnauthorized(true);
                }
              }}
              redirectUrl={window.location.href}
            />
          ) : (
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold">Sign in Required</h2>
              <p className="text-muted-foreground">
                You need to sign in to edit this document
              </p>
              <Button 
                variant="outline"
                onClick={() => {
                  setAuthMode("sign-in");
                  setShowAuthDialog(true);
                  setIsUnauthorized(false);
                }}
              >
                Sign in to continue
              </Button>
            </div>
          )}
        </div>
      )}
      
      <div className="flex h-screen overflow-hidden">
        {!isShared && (
          <DocumentSidebar
            documents={documents}
            activeDocumentId={activeDocumentId}
            onDocumentSelect={handleDocumentSelect}
            onNewDocument={handleNewDocument}
            onDeleteDocument={handleDeleteDocument}
            onRenameDocument={handleRenameDocument}
            isCollapsed={isSidebarCollapsed}
            onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            isSheetOpen={isSheetOpen}
            onSheetOpenChange={setIsSheetOpen}
          />
        )}
        <div className={cn(
          "flex-1 flex flex-col w-full overflow-hidden"
        )}>
          <div className="container mx-auto px-2 sm:px-6 py-2 sm:py-6 dark:bg-gray-900 dark:text-white min-h-screen overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-5xl mx-auto space-y-4"
            >
              <div className="flex flex-col gap-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="sm:hidden">
                      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                        <SheetTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Menu className="h-5 w-5" />
                          </Button>
                        </SheetTrigger>
                      </Sheet>
                    </div>
                    <NextLink href="/" className="hover:opacity-80 transition-opacity">
                      <h1 className="text-xl sm:text-2xl font-bold cursor-pointer truncate">
                        {isLoaded && (
                          isSignedIn ? (
                            <>Welcome {user?.firstName || user?.username}</>
                          ) : (
                            <>Welcome Guest</>
                          )
                        )}
                      </h1>
                    </NextLink>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isLoaded && (
                      <>
                        {isSignedIn ? (
                          <div className="flex items-center gap-3">
                            {Object.keys(presenceState).length > 0 && (
                              <ActiveUsers 
                                presenceState={presenceState} 
                                documentId={documentId || activeDocumentId} 
                                isOwner={isSignedIn && !isShared && !!user}
                                shareMode={isAccessRevoked ? 'view' : shareMode}
                                isAccessRevoked={isAccessRevoked}
                              />
                            )}
                            <UserButton 
                              afterSignOutUrl={`${pathname}?reload=true`}
                              {...getUserButtonProps(isAccessRevoked || currentAccessMode === 'view')}
                              userProfileMode="navigation"
                              userProfileUrl={undefined}
                              afterMultiSessionSingleSignOutUrl={`${pathname}?reload=true`}
                              key={`user-button-${isAccessRevoked}-${currentAccessMode}`}
                            />
                          </div>
                        ) : (
                          <div className="hidden sm:flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setAuthMode("sign-in")
                                setShowAuthDialog(true)
                              }}
                            >
                              Sign in
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setAuthMode("sign-up")
                                setShowAuthDialog(true)
                              }}
                            >
                              Sign up
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={toggleTheme}
                    >
                      {localTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                <div className="flex sm:hidden gap-2 w-full">
                  {isLoaded && !isSignedIn && (
                    <div className="flex sm:hidden gap-2 w-full">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => {
                          setAuthMode("sign-in")
                          setShowAuthDialog(true)
                        }}
                      >
                        Sign in
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => {
                          setAuthMode("sign-up")
                          setShowAuthDialog(true)
                        }}
                      >
                        Sign up
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 overflow-x-auto">
                  <div className="flex flex-wrap sm:flex-nowrap gap-2 flex-1 min-w-0">
                    <Button
                      variant="outline"
                      onClick={() => handleExport('PDF')}
                      disabled={isPdfExporting}
                      size="sm"
                      className="flex-1 sm:flex-initial min-w-0 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 transition-colors duration-200"
                    >
                      {isPdfExporting ? (
                        <>
                          <Loader className="h-4 w-4 mr-2 animate-spin" />
                          <span className="truncate">PDF</span>
                        </>
                      ) : (
                        <>
                          <FileDown className="h-4 w-4 sm:mr-2" />
                          <span className="hidden sm:inline">Export PDF</span>
                          <span className="sm:hidden">PDF</span>
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleExport('Word')}
                      disabled={isWordExporting}
                      size="sm"
                      className="flex-1 sm:flex-initial min-w-0 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 transition-colors duration-200"
                    >
                      {isWordExporting ? (
                        <>
                          <Loader className="h-4 w-4 mr-2 animate-spin" />
                          <span className="truncate">Word</span>
                        </>
                      ) : (
                        <>
                          <FileDown className="h-4 w-4 sm:mr-2" />
                          <span className="hidden sm:inline">Export Word</span>
                          <span className="sm:hidden">Word</span>
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleExport('HTML')}
                      disabled={isHtmlExporting}
                      size="sm"
                      className="flex-1 sm:flex-initial min-w-0 bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800 transition-colors duration-200"
                    >
                      {isHtmlExporting ? (
                        <>
                          <Loader className="h-4 w-4 mr-2 animate-spin" />
                          <span className="truncate">HTML</span>
                        </>
                      ) : (
                        <>
                          <FileDown className="h-4 w-4 sm:mr-2" />
                          <span className="hidden sm:inline">Export HTML</span>
                          <span className="sm:hidden">HTML</span>
                        </>
                      )}
                    </Button>
                  </div>
                  {activeDocumentId && (
                    <Button
                      variant="default"
                      onClick={() => setShowShareDialog(true)}
                      size="sm"
                      className="sm:ml-auto w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-200 flex items-center justify-center gap-2"
                    >
                      <Share className="h-4 w-4" />
                      <span>Share</span>
                    </Button>
                  )}
                </div>
              </div>

              <motion.div 
                layout
                className="bg-card rounded-lg shadow-lg overflow-hidden"
              >
                {!isReadOnly && (
                <div className="border-b pb-2 overflow-x-auto">
                  <div className="flex items-center gap-1 sm:gap-2 p-2 min-w-max">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => insertAtCursor('**', '**')}
                      title="Bold"
                    >
                      <Bold className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => insertAtCursor('*', '*')}
                      title="Italic"
                    >
                      <Italic className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => insertAtCursor('<u>', '</u>')}
                      title="Underline"
                    >
                      <Underline className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => insertAtCursor('~~', '~~')}
                      title="Strikethrough"
                    >
                      <Strikethrough className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => insertAtCursor('\n- ')}
                      title="List"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => insertAtCursor('# ')}
                      title="Heading 1"
                    >
                      <Heading1 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => insertAtCursor('## ')}
                      title="Heading 2"
                    >
                      <Heading2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => insertAtCursor('### ')}
                      title="Heading 3"
                    >
                      <Heading3 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => insertAtCursor('> ')}
                      title="Quote"
                    >
                      <Quote className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => insertAtCursor('`', '`')}
                      title="Code"
                    >
                      <Code className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => insertAtCursor('- [ ] ')}
                      title="Task List"
                    >
                      <Square className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => insertAtCursor('\n---\n')}
                      title="Horizontal Rule"
                    >
                      <span className="h-4 w-4 flex items-center justify-center font-mono">--</span>
                    </Button>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <ImageIcon className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <div className="space-y-2">
                          <h4 className="font-medium">Insert Image</h4>
                          <div className="space-y-2">
                            <Label htmlFor="image-url">Image URL</Label>
                            <Input id="image-url" placeholder="https://example.com/image.jpg" />
                          </div>
                          <Button 
                            onClick={() => {
                              const url = (document.getElementById('image-url') as HTMLInputElement)?.value
                              if (url) insertAtCursor(`![Image](${url})`)
                            }}
                            className="w-full"
                          >
                            Insert
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>

                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <LinkIcon className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <div className="space-y-2">
                          <h4 className="font-medium">Insert Link</h4>
                          <div className="space-y-2">
                            <Label htmlFor="link-text">Link Text</Label>
                            <Input id="link-text" placeholder="Link text" />
                            <Label htmlFor="link-url">URL</Label>
                            <Input id="link-url" placeholder="https://example.com" />
                          </div>
                          <Button 
                            onClick={() => {
                              const text = (document.getElementById('link-text') as HTMLInputElement)?.value
                              let url = (document.getElementById('link-url') as HTMLInputElement)?.value
                              
                              if (url && !url.startsWith('http')) {
                                url = `https://${url}`
                              }
                              
                              if (text && url) {
                                insertAtCursor(`[${text}](${url})`)
                              }
                            }}
                            className="w-full"
                          >
                            Insert
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>

                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => insertAtCursor('\n| Header 1 | Header 2 |\n| -------- | -------- |\n| Cell 1   | Cell 2   |\n')}
                    >
                      <Table className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => insertAtCursor('$', '$')}
                      title="Inline Math"
                    >
                      <span className="font-mono"></span>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => insertAtCursor('\n$$\n', '\n$$\n')}
                      title="Math Block"
                    >
                      <span className="font-mono">∫</span>
                    </Button>
                  </div>
                </div>
                )}

                <Tabs value={tab} onValueChange={setTab} className="min-h-[300px] sm:min-h-[600px] pt-2 relative">
                  <div className="border-b px-2 sm:px-4 pb-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-0">
                      <TabsList className="border-0 bg-muted">
                        <TabsTrigger 
                          value="write" 
                          className="data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground"
                        >
                          Write
                        </TabsTrigger>
                        <TabsTrigger 
                          value="preview" 
                          className="data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground"
                        >
                          Preview
                        </TabsTrigger>
                      </TabsList>
                      
                      <div className="flex items-center justify-between sm:flex-1">
                        <div className="flex-1 sm:text-center">
                          <span className="text-sm text-muted-foreground font-medium truncate">
                            {getCurrentDocumentTitle()}
                          </span>
                        </div>
                        <div className="flex-shrink-0">
                          <SaveStatusIndicator 
                            status={saveStatus} 
                            onManualSave={handleManualSave}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <AnimatePresence mode="wait">
                    <TabsContent key="write" value="write" className="m-0 p-0">
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="relative">
                          <textarea
                            value={content}
                            onChange={handleContentChange}
                            onMouseMove={handleMouseMove}
                            onSelect={handleSelect}
                            className={cn(
                              "w-full min-h-[600px] p-4 font-mono text-sm resize-none focus:outline-none",
                              "bg-background dark:bg-gray-800 dark:text-white",
                              isReadOnly && "cursor-not-allowed opacity-50"
                            )}
                            placeholder={
                              isShared && shareMode === 'edit' && !isSignedIn 
                                ? "Please sign in to edit this document" 
                                : isReadOnly 
                                  ? "This document is view-only" 
                                  : "Start writing..."
                            }
                            readOnly={isReadOnly}
                          />
                          
                          {/* Show remote cursors and selections */}
                          {Array.from(cursors.values()).map((cursor) => (
                            <div key={cursor.userId}>
                              {/* Cursor */}
                              <CursorPresence cursor={cursor} />
                              
                              {/* Selection highlight */}
                              {cursor.selection && cursor.selection.text && (
                                <div
                                  className="absolute pointer-events-none"
                                  style={{
                                    top: `${calculateSelectionPosition(cursor.selection).top}rem`,
                                    left: `${calculateSelectionPosition(cursor.selection).left}rem`,
                                    height: '1.5rem',
                                    backgroundColor: 'rgba(59, 130, 246, 0.2)', // blue-500 with opacity
                                    width: `${calculateSelectionPosition(cursor.selection).width}rem`,
                                    transition: 'all 0.1s ease-out'
                                  }}
                                >
                                  {/* Selection tooltip */}
                                  <div 
                                    className="absolute left-0 -top-6 bg-blue-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap"
                                    style={{ transform: 'translateY(-4px)' }}
                                  >
                                    {cursor.userName} selected: {cursor.selection.text.length > 20 
                                      ? cursor.selection.text.substring(0, 20) + '...' 
                                      : cursor.selection.text
                                    }
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    </TabsContent>
                    
                    <TabsContent key="preview" value="preview" className="m-0 p-0">
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="w-full min-h-[600px] p-4"
                        ref={targetRef}
                      >
                        <article className="prose prose-slate max-w-none dark:prose-invert print:max-w-none
                          prose-h1:text-3xl prose-h1:font-bold prose-h1:border-b prose-h1:border-gray-200 prose-h1:pb-4 prose-h1:mb-4
                          prose-h2:text-2xl prose-h2:font-bold prose-h2:border-b prose-h2:border-gray-200 prose-h2:pb-3 prose-h2:mb-4
                          prose-pre:bg-gray-100 dark:prose-pre:bg-gray-800
                          prose-code:text-gray-800 dark:prose-code:text-gray-200
                          prose-code:bg-gray-100 dark:prose-code:bg-gray-800
                          prose-code:rounded prose-code:px-1 prose-code:py-0.5
                          prose-ul:list-disc prose-ol:list-decimal
                          prose-blockquote:border-l-4 prose-blockquote:border-gray-300
                          prose-table:border-collapse prose-td:border prose-th:border
                          prose-img:rounded-lg
                          [&>*]:break-words [&>p]:whitespace-pre-wrap [&>p]:break-words [&>p]:overflow-wrap-anywhere"
                        >
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[rehypeRaw, rehypeKatex]}
                            components={markdownComponents}
                          >
                            {content}
                          </ReactMarkdown>
                        </article>
                      </motion.div>
                    </TabsContent>
                  </AnimatePresence>
                </Tabs>
              </motion.div>
            </motion.div>
          </div>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Switch to Preview</DialogTitle>
                <DialogDescription>
                  {dialogMessage}
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
          <AuthDialog 
            mode={authMode}
            isOpen={showAuthDialog}
            onOpenChange={(open) => {
              setShowAuthDialog(open)
              if (!open && isShared && shareMode === 'edit' && !isSignedIn) {
                setIsUnauthorized(true)
              }
            }}
            redirectUrl={redirectPath}
          />
          {activeDocumentId && (
            <ShareDialog
              isOpen={showShareDialog}
              onOpenChange={setShowShareDialog}
              documentId={activeDocumentId}
              onShare={handleShare}
            />
          )}
          {isShared && shareMode === 'edit' && !isSignedIn && (
            <div className="text-center text-sm text-muted-foreground mb-4">
              Please sign in to edit this document
            </div>
          )}
        </div>
      </div>
    </div>
  )
}