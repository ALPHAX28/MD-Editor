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
  Table as TableIcon, 
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
  Share,
  Printer,
  Sparkles,
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Document as DocxDocument, Paragraph, TextRun, HeadingLevel, Packer, AlignmentType, Table, TableRow, TableCell, BorderStyle } from 'docx';
import { asBlob } from 'html-docx-js-typescript';
import { FREE_DOCUMENT_LIMIT } from '@/lib/constants';

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
  title?: string
  redirectUrl?: string
  documents?: any[];
}

// Add this CSS class definition near the top of the component
const pdfStyles = `
@media print {
  .prose {
    max-width: none !important;
    color: black;
  }
  
  .prose h1 {
    margin-top: 1.5em;
    margin-bottom: 0.5em;
    font-size: 2em;
  }
  
  .prose h2 {
    margin-top: 1.25em;
    margin-bottom: 0.5em;
    font-size: 1.5em;
  }
  
  .prose h3 {
    margin-top: 1em;
    margin-bottom: 0.5em;
    font-size: 1.25em;
  }
  
  .prose p {
    margin: 1em 0;
    line-height: 1.6;
  }
  
  .prose ul, .prose ol {
    margin: 1em 0;
    padding-left: 2em;
  }
  
  .prose li {
    margin: 0.5em 0;
    line-height: 1.6;
  }
  
  .prose blockquote {
    margin: 1em 0;
    padding-left: 1em;
    border-left: 4px solid #e5e7eb;
  }
  
  .prose pre {
    margin: 1em 0;
    padding: 1em;
    background-color: #f3f4f6;
    border-radius: 4px;
    overflow-x: auto;
  }
  
  .prose code {
    background-color: #f3f4f6;
    padding: 0.2em 0.4em;
    border-radius: 3px;
    font-size: 0.9em;
  }
  
  .prose table {
    margin: 1em 0;
    border-collapse: collapse;
    width: 100%;
  }
  
  .prose th, .prose td {
    border: 1px solid #e5e7eb;
    padding: 0.5em;
    text-align: left;
  }
  
  .prose img {
    max-width: 100%;
    height: auto;
    margin: 1em auto;
  }
}
`;

// Move this helper function to the top, before any hooks
const getSafeFilename = (documents: Document[], activeDocumentId: string | undefined) => {
  let filename = 'untitled'
  
  if (activeDocumentId) {
    const currentDoc = documents.find(doc => doc.id === activeDocumentId)
    if (currentDoc?.title) {
      // Sanitize the filename by removing invalid characters
      filename = currentDoc.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()
    }
  }
  
  return filename
}

export function MarkdownEditor({ 
  documentId,
  isShared = false,
  shareMode = 'private',
  initialContent = '',
  title,
  redirectUrl,
  documents
}: MarkdownEditorProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  const [tab, setTab] = useState('write')
  const [isPdfExporting, setIsPdfExporting] = useState(false)
  const [isWordExporting, setIsWordExporting] = useState(false)
  const [isHtmlExporting, setIsHtmlExporting] = useState(false)
  const [localDocuments, setLocalDocuments] = useState<Document[]>([])
  const [activeDocumentId, setActiveDocumentId] = useState<string>()

  // Now we can use getSafeFilename with the required parameters
  const { toPDF, targetRef } = usePDF({
    filename: `${getSafeFilename(localDocuments, activeDocumentId)}.pdf`
  })

  const [showDialog, setShowDialog] = useState(false)
  const [dialogMessage, setDialogMessage] = useState('')
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { user } = useUser();
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up">("sign-in")
  const { toast } = useToast()
  const { theme, setTheme } = useTheme()

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
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showNewDocDialog, setShowNewDocDialog] = useState(false);
  const [showSearchDialog, setShowSearchDialog] = useState(false);

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
      setLocalDocuments(data)
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
      // First save the current content
      if (documentId) {
        try {
          const response = await fetch(`/api/documents/${documentId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              content,
              isAutosave: true
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to save document');
          }
        } catch (error) {
          console.error('Error saving document:', error);
          toast({
            title: "Error",
            description: "Failed to save changes before exporting",
            variant: "destructive"
          });
          return;
        }
      }

      // Create a temporary container for PDF export
      const tempContainer = document.createElement('div')
      tempContainer.innerHTML = targetRef.current?.innerHTML || ''
      document.body.appendChild(tempContainer)
      
      // Add print styles
      const styleElement = document.createElement('style')
      styleElement.innerHTML = pdfStyles
      document.head.appendChild(styleElement)
      
      if (isDarkMode) {
        document.documentElement.classList.remove('dark')
      }
      
      // Add some delay to ensure styles are applied
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // Configure PDF options
      const pdfOptions = {
        filename: `${getSafeFilename(localDocuments, activeDocumentId)}.pdf`,
        page: {
          margin: 40,
          format: 'a4',
        },
        overrides: {
          pdf: {
            compress: true,
            quality: 100,
          },
        },
      }
      
      await toPDF(pdfOptions)
      
      // Cleanup
      if (isDarkMode) {
        document.documentElement.classList.add('dark')
      }
      document.head.removeChild(styleElement)
      document.body.removeChild(tempContainer)
    } catch (error) {
      console.error('PDF export error:', error)
      if (isDarkMode) {
        document.documentElement.classList.add('dark')
      }
      toast({
        title: "Error",
        description: "Failed to export PDF",
        variant: "destructive"
      });
    }
  }

  const handleExport = async (type: 'PDF' | 'Word' | 'HTML') => {
    if (!isLoaded || !isSignedIn) {
      setAuthMode("sign-in");
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
      toast({
        title: "Error",
        description: `Failed to export to ${type}`,
        variant: "destructive",
      })
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
      const previewContent = document.querySelector('.prose')?.innerHTML;
      if (!previewContent) {
        throw new Error('Preview content not found');
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              @page {
                size: A4;
                margin: 1in;  /* Reduced margins */
              }
              body {
                font-family: 'Calibri', sans-serif;
                font-size: 11pt;
                line-height: 1.5;
                color: #000000;
                margin: 0;
                padding: 0;
                width: 100%;
                max-width: 8.5in;  /* Standard page width */
              }
              .container {
                width: 100%;
                max-width: 6.5in;  /* Account for margins */
                margin: 0 auto;
              }
              h1 { 
                font-size: 18pt; 
                font-weight: bold; 
                margin: 24pt 0 6pt 0; 
                color: #000000;
                width: 100%;
              }
              h2 { 
                font-size: 14pt; 
                font-weight: bold; 
                margin: 18pt 0 6pt 0; 
                color: #000000;
                width: 100%;
              }
              h3 { 
                font-size: 12pt; 
                font-weight: bold; 
                margin: 12pt 0 6pt 0; 
                color: #000000;
                width: 100%;
              }
              p { 
                margin: 0 0 10pt 0;
                width: 100%;
                text-align: justify;  /* Better text distribution */
              }
              ul, ol { 
                margin: 6pt 0; 
                padding-left: 24pt;
                width: calc(100% - 24pt);  /* Account for padding */
              }
              li { 
                margin: 4pt 0;
                width: 100%;
              }
              pre, code {
                font-family: 'Courier New', monospace;
                font-size: 10pt;
                background-color: #f5f5f5;
                padding: 6pt;
                margin: 6pt 0;
                border: 1pt solid #e1e1e1;
                width: calc(100% - 12pt);  /* Account for padding */
                box-sizing: border-box;
                white-space: pre-wrap;
                word-wrap: break-word;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin: 12pt 0;
                table-layout: fixed;  /* Fixed table layout */
              }
              th, td {
                border: 1pt solid #000000;
                padding: 6pt;
                text-align: left;
                word-wrap: break-word;  /* Allow word wrapping in cells */
              }
              th {
                font-weight: bold;
                background-color: #f5f5f5;
              }
              blockquote {
                margin: 12pt 24pt;
                padding-left: 12pt;
                border-left: 3pt solid #666666;
                color: #333333;
                width: calc(100% - 36pt);  /* Account for margin and padding */
              }
              img {
                max-width: 100%;
                height: auto;
                display: block;
                margin: 12pt auto;
              }
              a {
                color: #0563C1;
                text-decoration: underline;
              }
            </style>
          </head>
          <body>
            <div class="container">
              ${previewContent}
            </div>
          </body>
        </html>
      `;

      // Create blob with Word-specific MIME type
      const blob = new Blob([htmlContent], {
        type: 'application/msword;charset=utf-8'
      });
      
      await saveAs(blob,`${getSafeFilename(localDocuments, activeDocumentId)}.doc`);

      console.log("Word document exported successfully");
    } catch (error) {
      throw error;
    }
  };

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
      await saveAs(blob, `${getSafeFilename(localDocuments, activeDocumentId)}.html`)

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
      setLocalDocuments(prev => [...prev, { ...newDoc, title: title || 'Untitled Document' }]);
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
      setLocalDocuments(prev => prev.map(doc => 
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
      
      setLocalDocuments(prev => prev.filter(doc => doc.id !== documentId))
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
    const currentDoc = localDocuments.find(doc => doc.id === activeDocumentId);
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
    
    // Update content in realtime if channel is ready
    // Remove the document ID check since we want updates in both directions
    if (isChannelReady) {
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
  }, [isLoaded, pathname]);

  // Update the cleanup effect
  useEffect(() => {
    return () => {
      if (!isShared) {
        removeCursor?.();
        clearPresence?.();
      }
    };
  }, [activeDocumentId, isShared, removeCursor, clearPresence]);

  // Modify the isEditingAllowed check to allow editing for guests
  const isEditingAllowed = useMemo(() => {
    if (isShared) {
      // In shared mode, only allow editing if:
      // 1. It's in edit mode
      // 2. Not access revoked
      return shareMode === 'edit' && !isAccessRevoked;
    }
    
    // In regular mode, allow editing unless access is revoked
    return !isAccessRevoked;
  }, [isShared, shareMode, isAccessRevoked]);

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

  // Add this helper function near the top of the component
  const getExportButtonTooltip = (isSignedIn: boolean) => {
    return isSignedIn ? undefined : "Please sign in to export";
  };

  const handlePrint = () => {
    if (tab !== 'preview') {
      setDialogMessage('Please switch to the Preview tab before printing.')
      setShowDialog(true)
      return
    }

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast({
        title: "Error",
        description: "Failed to open print window. Please check your popup settings.",
        variant: "destructive",
      })
      return
    }

    // Add the same styles we use for PDF
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${getSafeFilename(localDocuments, activeDocumentId)}</title>
          <style>
            ${pdfStyles}
            @media print {
              body {
                padding: 20px;
              }
            }
          </style>
        </head>
        <body>
          <div class="prose">
            ${targetRef.current?.innerHTML || ''}
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              }
            }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  // Add this helper function at the top of the component
  const getUserTierBadge = (isSignedIn: boolean) => {
    return (
      <div className={cn(
        "px-2 py-1 rounded-full text-xs font-medium",
        isSignedIn ? "bg-secondary" : "bg-muted"
      )}>
        {isSignedIn ? "Free Plan" : "No Plan"}
      </div>
    );
  };

  // Add this function near other handlers
  const handleNewDocumentClick = () => {
    if (localDocuments.length >= FREE_DOCUMENT_LIMIT) {
      toast({
        title: "Document Limit Reached",
        description: "You've reached the free plan limit. Upgrade to Pro for unlimited documents.",
        variant: "destructive",
      });
      handleUpgradeClick();
      return;
    }
    setShowNewDocDialog(true);
  };

  // Update the keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey) {
        if (e.key === 'n') {
          e.preventDefault();
          if (isSignedIn) {
            if (localDocuments.length >= FREE_DOCUMENT_LIMIT) {
              toast({
                title: "Document Limit Reached",
                description: "You've reached the free plan limit. Upgrade to Pro for unlimited documents.",
                variant: "destructive",
              });
              handleUpgradeClick();
              return;
            }
            setShowNewDocDialog(true);
          }
        } else if (e.key === 's') {
          e.preventDefault();
          if (isSignedIn) {
            setShowSearchDialog(true);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSignedIn, localDocuments.length, toast]);

  const handleUpgradeClick = () => {
    setShowUpgradeDialog(true);
  };

  return (
    <div className="relative h-full">
      {isShared && !isSignedIn && (
        <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center">
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
        </div>
      )}
      
      <div className="flex h-screen overflow-hidden">
        {!isShared && (
          <DocumentSidebar
            documents={localDocuments}
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
              <div className="flex flex-col space-y-4">
                {/* Top header with user info and controls */}
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

                  <div className="flex items-center gap-2">
                    {isLoaded && (
                      <>
                        {isSignedIn ? (
                          <div className="flex items-center gap-3">
                            {/* Only show pricing and plan badge if not in shared mode */}
                            {!isShared && (
                              <>
                                <TooltipProvider delayDuration={0}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="premium"
                                        size="sm"
                                        onClick={() => {
                                          toast({
                                            title: "Coming Soon",
                                            description: "Pro plan subscriptions will be available soon!",
                                            duration: 3000,
                                          });
                                        }}
                                        className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white border-0"
                                      >
                                        <Sparkles className="h-4 w-4" />
                                        <span>Upgrade</span>
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">
                                      View pricing plans
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>

                                {getUserTierBadge(isSignedIn)}
                              </>
                            )}

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

                {/* Action buttons row */}
                <div className="flex flex-col sm:flex-row gap-2 sm:justify-between">
                  {/* Export buttons group */}
                  <div className="grid grid-cols-3 gap-2 sm:flex-1 sm:max-w-[600px]">
                    <Button
                      variant="outline"
                      onClick={() => handleExport('PDF')}
                      disabled={isPdfExporting || !isSignedIn}
                      size="sm"
                      className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 transition-colors duration-200"
                    >
                      <FileDown className="h-4 w-4 mr-2" />
                      Export PDF
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => handleExport('Word')}
                      disabled={isWordExporting || !isSignedIn}
                      size="sm"
                      className="w-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 transition-colors duration-200"
                    >
                      <FileDown className="h-4 w-4 mr-2" />
                      Export Word
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => handleExport('HTML')}
                      disabled={isHtmlExporting || !isSignedIn}
                      size="sm"
                      className="w-full bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800 transition-colors duration-200"
                    >
                      <FileDown className="h-4 w-4 mr-2" />
                      Export HTML
                    </Button>
                  </div>

                  {/* Print and Share buttons */}
                  {activeDocumentId && !isShared && (
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-none">
                      <Button
                        variant="outline"
                        onClick={handlePrint}
                        size="sm"
                        className="w-full sm:w-auto bg-secondary text-secondary-foreground hover:bg-secondary/90 transition-colors duration-200"
                      >
                        <Printer className="h-4 w-4 mr-2" />
                        Print
                      </Button>

                      <Button
                        variant="default"
                        onClick={() => setShowShareDialog(true)}
                        size="sm"
                        className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-200"
                      >
                        <Share className="h-4 w-4 mr-2" />
                        Share
                      </Button>
                    </div>
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
                      <TableIcon className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => insertAtCursor('$', '$')}
                      title="Inline Math"
                    >
                      <span className="h-4 w-4 flex items-center justify-center font-mono text-sm">∑</span>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => insertAtCursor('\n$$\n', '\n$$\n')}
                      title="Math Block"
                    >
                      <span className="h-4 w-4 flex items-center justify-center font-mono text-sm">∫</span>
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
                              isReadOnly 
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
                          prose-headings:font-bold
                          prose-h1:text-3xl prose-h1:mt-8 prose-h1:mb-4
                          prose-h2:text-2xl prose-h2:mt-6 prose-h2:mb-4
                          prose-h3:text-xl prose-h3:mt-4 prose-h3:mb-3
                          prose-p:my-4 prose-p:leading-7
                          prose-pre:bg-muted prose-pre:p-4 prose-pre:rounded-lg
                          prose-code:text-foreground prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md
                          prose-ul:my-4 prose-ul:list-disc prose-ul:pl-6
                          prose-ol:my-4 prose-ol:list-decimal prose-ol:pl-6
                          prose-li:my-2 prose-li:leading-7
                          prose-blockquote:border-l-4 prose-blockquote:border-muted prose-blockquote:pl-4 prose-blockquote:my-4
                          prose-table:my-4 prose-table:w-full
                          prose-th:border prose-th:border-muted prose-th:p-2 prose-th:bg-muted
                          prose-td:border prose-td:border-muted prose-td:p-2
                          prose-img:my-4 prose-img:rounded-lg
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
            mode="sign-in"
            isOpen={showAuthDialog}
            onOpenChange={setShowAuthDialog}
            redirectUrl={redirectUrl || window.location.href}
          />
          {activeDocumentId && (
            <ShareDialog
              isOpen={showShareDialog}
              onOpenChange={setShowShareDialog}
              documentId={activeDocumentId}
              onShare={handleShare}
            />
          )}
        </div>
      </div>
    </div>
  )
}